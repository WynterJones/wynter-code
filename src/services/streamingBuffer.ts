/**
 * Streaming Buffer Service
 *
 * Batches streaming text updates to reduce state update frequency.
 * Text is buffered for ~32ms (30fps) before flushing to state.
 * Tool events bypass batching and flush immediately to maintain correct ordering.
 */

type TextBatchCallback = (sessionId: string, text: string) => void;
type ThinkingBatchCallback = (sessionId: string, text: string) => void;

class StreamingBuffer {
  private textBuffers = new Map<string, string>();
  private thinkingBuffers = new Map<string, string>();
  private textTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private thinkingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Batch interval in ms (~30fps for smooth updates without blocking)
  private readonly batchInterval = 32;

  onTextBatch: TextBatchCallback | null = null;
  onThinkingBatch: ThinkingBatchCallback | null = null;

  /**
   * Append text to the buffer. Will be flushed after batchInterval.
   */
  appendText(sessionId: string, text: string): void {
    const current = this.textBuffers.get(sessionId) || '';
    this.textBuffers.set(sessionId, current + text);

    // Schedule flush if not already scheduled
    if (!this.textTimers.has(sessionId)) {
      const timer = setTimeout(() => {
        this.flushText(sessionId);
      }, this.batchInterval);
      this.textTimers.set(sessionId, timer);
    }
  }

  /**
   * Append thinking text to the buffer. Will be flushed after batchInterval.
   */
  appendThinking(sessionId: string, text: string): void {
    const current = this.thinkingBuffers.get(sessionId) || '';
    this.thinkingBuffers.set(sessionId, current + text);

    // Schedule flush if not already scheduled
    if (!this.thinkingTimers.has(sessionId)) {
      const timer = setTimeout(() => {
        this.flushThinking(sessionId);
      }, this.batchInterval);
      this.thinkingTimers.set(sessionId, timer);
    }
  }

  /**
   * Flush pending text to state immediately.
   */
  flushText(sessionId: string): void {
    const timer = this.textTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.textTimers.delete(sessionId);
    }

    const text = this.textBuffers.get(sessionId);
    if (text && this.onTextBatch) {
      this.textBuffers.set(sessionId, '');
      this.onTextBatch(sessionId, text);
    }
  }

  /**
   * Flush pending thinking text to state immediately.
   */
  flushThinking(sessionId: string): void {
    const timer = this.thinkingTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.thinkingTimers.delete(sessionId);
    }

    const text = this.thinkingBuffers.get(sessionId);
    if (text && this.onThinkingBatch) {
      this.thinkingBuffers.set(sessionId, '');
      this.onThinkingBatch(sessionId, text);
    }
  }

  /**
   * Flush all pending content for a session.
   * Call this before tool events to ensure correct ordering.
   */
  flushAll(sessionId: string): void {
    this.flushText(sessionId);
    this.flushThinking(sessionId);
  }

  /**
   * Clear all buffers for a session (on session end/reset).
   */
  clear(sessionId: string): void {
    // Clear timers
    const textTimer = this.textTimers.get(sessionId);
    if (textTimer) {
      clearTimeout(textTimer);
      this.textTimers.delete(sessionId);
    }

    const thinkingTimer = this.thinkingTimers.get(sessionId);
    if (thinkingTimer) {
      clearTimeout(thinkingTimer);
      this.thinkingTimers.delete(sessionId);
    }

    // Clear buffers
    this.textBuffers.delete(sessionId);
    this.thinkingBuffers.delete(sessionId);
  }

  /**
   * Clear all sessions (on app reset).
   */
  clearAll(): void {
    for (const timer of this.textTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.thinkingTimers.values()) {
      clearTimeout(timer);
    }

    this.textTimers.clear();
    this.thinkingTimers.clear();
    this.textBuffers.clear();
    this.thinkingBuffers.clear();
  }
}

// Singleton instance
export const streamingBuffer = new StreamingBuffer();
