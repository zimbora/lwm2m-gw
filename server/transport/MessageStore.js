class MessageStore {
  constructor(timeoutMs = 60000) {
    // Internal map: token -> { method, path, ep, timeout, format, added }
    this.messages = new Map();
    this.timeoutMs = timeoutMs;
  }

  /**
   * Add a new message.
   * @param {string} token - Unique token
   * @param {Object} data - { method, path, ep, timeout, format }
   */
  add(token, { method, path, ep, timeout, msgId, format }) {
    const now = Date.now();
    this.messages.set(token, {
      method,
      path,
      ep,
      timeout: timeout ?? this.timeoutMs,
      msgId,
      format,
      added: now,
    });
  }

  /**
   * Find a message by token.
   * @param {string} token
   * @returns {Object|null}
   */
  get(token) {
    const entry = this.messages.get(token);
    if (!entry) return null;

    return entry;
  }

  /**
   * Delete a message by token.
   * @param {string} token
   * @returns {boolean} True if deleted
   */
  delete(token) {
    return this.messages.delete(token);
  }

  /**
   * Clean all expired messages.
   * Removes entries whose timeout has expired.
   */
  cleanExpired() {
    const now = Date.now();
    for (const [token, entry] of this.messages.entries()) {
      if (now - entry.added > entry.timeout) {
        this.messages.delete(token);
      }
    }
  }

  /**
   * List all messages in the map.
   * @returns {Array} Array of [token, data] entries.
   */
  list() {
    return Array.from(this.messages.entries());
  }
}

module.exports = MessageStore;