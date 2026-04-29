export type CallOverlayState = {
  visible: boolean;
  appointmentId?: string;
  remoteUserName?: string;
};

type CallOverlayListener = (state: CallOverlayState) => void;

let currentState: CallOverlayState = {
  visible: false,
};

const listeners = new Set<CallOverlayListener>();

export const getCallOverlayState = (): CallOverlayState => currentState;

export const setCallOverlayState = (next: CallOverlayState) => {
  currentState = next;
  listeners.forEach((listener) => listener(currentState));
};

export const subscribeCallOverlayState = (listener: CallOverlayListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
