import { Platform } from "react-native";
import type {
  AIMessage,
  AIMessageMetadata,
  SendMessageResponse,
} from "../_services/api";
import { normalizeAIMessageMetadata } from "../_services/api";
import { HERA_AI_API_KEY, HERA_AI_API_URL } from "./heraApiConfig";
import type { HeraMessageAttachment } from "./heraAttachment";
import { resolveMessageImageUri } from "./heraAttachment";

export type { HeraMessageAttachment };

export interface HeraStreamStatus {
  state: string;
  query?: string;
}

export interface HeraStreamCallbacks {
  onUserMessage?: (message: AIMessage) => void;
  onStatus?: (status: HeraStreamStatus) => void;
  onAssistantDelta?: (fullContent: string) => void;
  onComplete: (data: SendMessageResponse) => void;
  onError: (error: Error) => void;
}

interface ParsedSseEvent {
  event?: string;
  data: string;
}

interface StreamState {
  assistantContent: string;
  userMessage: AIMessage | null;
}

function parseSseChunk(buffer: string): { events: ParsedSseEvent[]; rest: string } {
  const events: ParsedSseEvent[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const block of parts) {
    if (!block.trim()) continue;
    let eventName: string | undefined;
    const dataLines: string[] = [];

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length) {
      events.push({ event: eventName, data: dataLines.join("\n") });
    }
  }

  return { events, rest };
}

function extractAssistantMetadata(raw: unknown): AIMessageMetadata | undefined {
  return normalizeAIMessageMetadata(raw);
}

function parseStatusPayload(parsed: unknown): HeraStreamStatus | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const state =
    typeof obj.state === "string"
      ? obj.state
      : typeof obj.status === "string"
        ? obj.status
        : typeof obj.message === "string"
          ? obj.message
          : null;
  if (!state) return null;
  return {
    state,
    query: typeof obj.query === "string" ? obj.query : undefined,
  };
}

function extractDeltaText(parsed: unknown, rawData: string): string | null {
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.delta === "string") return obj.delta;
    if (typeof obj.content === "string") return obj.content;
  }
  if (rawData && rawData !== "[DONE]") return rawData;
  return null;
}

function finalizeMessages(
  userMessage: AIMessage,
  assistantMessage: AIMessage,
  imageUri?: string,
): SendMessageResponse {
  let metadata = extractAssistantMetadata(assistantMessage.metadata);

  if (!metadata) {
    try {
      const parsed = JSON.parse(assistantMessage.content);
      if (parsed && typeof parsed === "object") {
        metadata = extractAssistantMetadata(parsed.metadata || parsed);
      }
    } catch {
      // plain text
    }
  }

  return {
    user_message: {
      ...userMessage,
      image_url: imageUri ?? resolveMessageImageUri(userMessage),
    },
    assistant_message: {
      ...assistantMessage,
      metadata,
    },
  };
}

function buildDoneResponse(
  assistantMessage: AIMessage,
  state: StreamState,
  sessionId: string,
  fallbackContent: string,
  imageUri?: string,
): SendMessageResponse {
  const userMessage =
    state.userMessage ??
    ({
      id: `temp-user-${Date.now()}`,
      session_id: sessionId,
      role: "user",
      content: fallbackContent,
      created_at: new Date().toISOString(),
    } as AIMessage);

  return finalizeMessages(userMessage, assistantMessage, imageUri);
}

function handleStreamEvent(
  ev: ParsedSseEvent,
  callbacks: HeraStreamCallbacks,
  state: StreamState,
  sessionId: string,
  userContent: string,
  imageUri?: string,
): SendMessageResponse | null {
  if (ev.data === "[DONE]") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(ev.data);
  } catch {
    parsed = null;
  }

  const eventType = ev.event ?? undefined;

  if (eventType === "user_message" && parsed && typeof parsed === "object") {
    const userMessage = parsed as AIMessage;
    const resolvedImage = imageUri ?? resolveMessageImageUri(userMessage);
    if (resolvedImage) {
      userMessage.image_url = resolvedImage;
    }
    state.userMessage = userMessage;
    callbacks.onUserMessage?.(userMessage);
    return null;
  }

  if (eventType === "status") {
    const status = parseStatusPayload(parsed ?? ev.data);
    if (status) callbacks.onStatus?.(status);
    return null;
  }

  if (eventType === "delta") {
    const deltaText = extractDeltaText(parsed, ev.data);
    if (deltaText) {
      state.assistantContent += deltaText;
      callbacks.onAssistantDelta?.(state.assistantContent);
    }
    return null;
  }

  if (eventType === "done" && parsed && typeof parsed === "object") {
    return buildDoneResponse(
      parsed as AIMessage,
      state,
      sessionId,
      userContent,
      imageUri,
    );
  }

  return null;
}

function drainSseBuffer(
  buffer: string,
  callbacks: HeraStreamCallbacks,
  state: StreamState,
  sessionId: string,
  userContent: string,
  imageUri?: string,
): { rest: string; completed: SendMessageResponse | null } {
  const { events, rest } = parseSseChunk(buffer);
  for (const ev of events) {
    const completed = handleStreamEvent(
      ev,
      callbacks,
      state,
      sessionId,
      userContent,
      imageUri,
    );
    if (completed) return { rest, completed };
  }
  return { rest, completed: null };
}

function isNativePlatform(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

function streamViaXhr(
  url: string,
  content: string,
  callbacks: HeraStreamCallbacks,
  state: StreamState,
  sessionId: string,
  imageUri?: string,
  signal?: AbortSignal,
  attachments?: HeraMessageAttachment[],
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "text";
    try {
      xhr.overrideMimeType("text/event-stream");
    } catch {
      // optional on some runtimes
    }
    xhr.setRequestHeader("accept", "text/event-stream");
    xhr.setRequestHeader("X-API-Key", HERA_AI_API_KEY);
    xhr.setRequestHeader("Content-Type", "application/json");

    let buffer = "";
    let responseOffset = 0;
    let settled = false;

    const finish = (result: boolean | Error) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      if (result instanceof Error) reject(result);
      else resolve(result);
    };

    const onAbort = () => {
      xhr.abort();
      finish(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort);

    const processIncoming = () => {
      const chunk = xhr.responseText.slice(responseOffset);
      responseOffset = xhr.responseText.length;
      if (!chunk) return;

      buffer += chunk;
      const { rest, completed } = drainSseBuffer(
        buffer,
        callbacks,
        state,
        sessionId,
        content,
        imageUri,
      );
      buffer = rest;

      if (completed) {
        callbacks.onComplete(completed);
        finish(true);
        xhr.abort();
      }
    };

    xhr.onprogress = processIncoming;

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.LOADING) {
        processIncoming();
      }
    };

    xhr.onload = () => {
      if (settled) return;

      if (xhr.status < 200 || xhr.status >= 300) {
        finish(new Error(`Stream HTTP ${xhr.status}`));
        return;
      }

      processIncoming();

      if (buffer.trim()) {
        const { completed } = drainSseBuffer(
          `${buffer}\n\n`,
          callbacks,
          state,
          sessionId,
          content,
          imageUri,
        );
        if (completed) {
          callbacks.onComplete(completed);
          finish(true);
          return;
        }
      }

      if (state.assistantContent) {
        callbacks.onComplete(
          buildDoneResponse(
            {
              id: `temp-assistant-${Date.now()}`,
              session_id: sessionId,
              role: "assistant",
              content: state.assistantContent,
              created_at: new Date().toISOString(),
            },
            state,
            sessionId,
            content,
            imageUri,
          ),
        );
        finish(true);
        return;
      }

      finish(new Error("Stream ended without a done event"));
    };

    xhr.onerror = () => {
      if (!settled) finish(new Error("Stream network error"));
    };

    xhr.send(
      JSON.stringify({
        content,
        ...(attachments?.length ? { attachments } : {}),
      }),
    );
  });
}

async function streamViaFetchReader(
  response: Response,
  callbacks: HeraStreamCallbacks,
  state: StreamState,
  sessionId: string,
  content: string,
  imageUri?: string,
): Promise<boolean> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { rest, completed } = drainSseBuffer(
      buffer,
      callbacks,
      state,
      sessionId,
      content,
      imageUri,
    );
    buffer = rest;

    if (completed) {
      callbacks.onComplete(completed);
      return true;
    }
  }

  if (buffer.trim()) {
    const { completed } = drainSseBuffer(
      `${buffer}\n\n`,
      callbacks,
      state,
      sessionId,
      content,
      imageUri,
    );
    if (completed) {
      callbacks.onComplete(completed);
      return true;
    }
  }

  if (state.assistantContent) {
    callbacks.onComplete(
      buildDoneResponse(
        {
          id: `temp-assistant-${Date.now()}`,
          session_id: sessionId,
          role: "assistant",
          content: state.assistantContent,
          created_at: new Date().toISOString(),
        },
        state,
        sessionId,
        content,
        imageUri,
      ),
    );
    return true;
  }

  throw new Error("Stream ended without a done event");
}

export async function streamHeraAIMessage(
  sessionId: string,
  content: string,
  callbacks: HeraStreamCallbacks,
  signal?: AbortSignal,
  imageUri?: string,
  attachments?: HeraMessageAttachment[],
): Promise<boolean> {
  const url = `${HERA_AI_API_URL}/sessions/${sessionId}/messages/stream`;
  const state: StreamState = { assistantContent: "", userMessage: null };

  if (isNativePlatform()) {
    console.log("[heraAiStream] Native XHR SSE →", url);
    return streamViaXhr(
      url,
      content,
      callbacks,
      state,
      sessionId,
      imageUri,
      signal,
      attachments,
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "text/event-stream",
      "X-API-Key": HERA_AI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      ...(attachments?.length ? { attachments } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Stream HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isEventStream = contentType.includes("text/event-stream");

  if (!isEventStream) {
    const json = await response.json();
    if (Array.isArray(json) && json.length >= 2) {
      callbacks.onComplete(
        finalizeMessages(json[0] as AIMessage, json[1] as AIMessage, imageUri),
      );
      return true;
    }
    throw new Error("Invalid stream response format");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Fetch streaming unavailable (no response body reader)");
  }

  return streamViaFetchReader(
    response,
    callbacks,
    state,
    sessionId,
    content,
    imageUri,
  );
}
