import * as FileSystem from "expo-file-system/legacy";

export interface HeraMessageAttachment {
  filename: string;
  content_type: string;
  data: string;
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i;

export function isImageMimeType(mimeType?: string): boolean {
  return !!mimeType?.startsWith("image/");
}

export function isImageFilename(filename?: string): boolean {
  return !!filename && IMAGE_EXTENSIONS.test(filename);
}

export function isImageAttachment(
  attachment: Pick<HeraMessageAttachment, "content_type" | "filename">,
): boolean {
  return (
    isImageMimeType(attachment.content_type) ||
    isImageFilename(attachment.filename)
  );
}

export function normalizeImageContentType(
  contentType: string,
  filename?: string,
): string {
  if (isImageMimeType(contentType)) return contentType;
  const lower = filename?.toLowerCase() ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (isImageFilename(filename)) return "image/jpeg";
  return contentType;
}

export function isPdfMimeType(mimeType?: string, filename?: string): boolean {
  if (mimeType === "application/pdf") return true;
  return !!filename?.toLowerCase().endsWith(".pdf");
}

export function isSupportedAttachmentMime(
  mimeType?: string,
  filename?: string,
): boolean {
  return isImageMimeType(mimeType) || isPdfMimeType(mimeType, filename);
}

export function resolveMessageImageUri(message: {
  image_url?: string;
  attachments?: HeraMessageAttachment[];
}): string | undefined {
  if (message.image_url) return message.image_url;

  const imageAttachment = message.attachments?.find(isImageAttachment);
  if (!imageAttachment?.data) return undefined;

  const contentType = normalizeImageContentType(
    imageAttachment.content_type,
    imageAttachment.filename,
  );
  return `data:${contentType};base64,${imageAttachment.data}`;
}

export function buildAttachmentPreviewUri(
  attachment: HeraMessageAttachment,
): string | undefined {
  if (!attachment.data || !isImageAttachment(attachment)) return undefined;
  const contentType = normalizeImageContentType(
    attachment.content_type,
    attachment.filename,
  );
  return `data:${contentType};base64,${attachment.data}`;
}

export async function buildHeraAttachmentFromUri(params: {
  uri: string;
  filename: string;
  contentType: string;
  fileSize?: number;
}): Promise<HeraMessageAttachment> {
  const { uri, filename, contentType, fileSize } = params;

  if (fileSize != null && fileSize > MAX_ATTACHMENT_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error("FILE_NOT_FOUND");
  }

  const size = "size" in info && typeof info.size === "number" ? info.size : fileSize;
  if (size != null && size > MAX_ATTACHMENT_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const data = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    filename,
    content_type: normalizeImageContentType(contentType, filename),
    data,
  };
}
