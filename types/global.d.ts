/**
 * Global type definitions for browser APIs
 */

// Vendor-prefixed AudioContext for Safari support
interface Window {
  webkitAudioContext?: typeof AudioContext;
  /**
   * requestIdleCallback schedules work to be done during browser idle time.
   * Not available in all browsers (Safari doesn't support it).
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
   */
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  /**
   * Cancels a callback scheduled with requestIdleCallback.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/cancelIdleCallback
   */
  cancelIdleCallback?: (handle: number) => void;
}

/**
 * Callback passed to requestIdleCallback
 */
interface IdleRequestCallback {
  (deadline: IdleDeadline): void;
}

/**
 * Options for requestIdleCallback
 */
interface IdleRequestOptions {
  /** Maximum time to wait before forcing callback execution */
  timeout?: number;
}

/**
 * Deadline object passed to IdleRequestCallback
 */
interface IdleDeadline {
  /** Returns whether the callback was invoked due to timeout */
  readonly didTimeout: boolean;
  /** Returns remaining time in the current idle period */
  timeRemaining(): DOMHighResTimeStamp;
}
