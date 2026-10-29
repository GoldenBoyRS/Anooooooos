/**
 * ConnectionQueue.js
 * Centralized queue for WhatsApp socket connections and reconnections.
 * Prevents mass connection bursts (OOM, socket exhaustion, WhatsApp rate limits).
 */

class ConnectionQueue {
  constructor(options = {}) {
    this.concurrency = Number(options.concurrency) || Number(process.env.MAX_CONCURRENT_RECONNECTS) || 10;
    this.rateLimitDelay = Number(options.rateLimitDelay) || Number(process.env.QUEUE_INTERVAL_MS) || 500;
    this.queue = [];
    this.activeWorkers = 0;
    this.processing = false;
    this.stats = {
      queued: 0,
      processed: 0,
      failed: 0
    };
  }

  /**
   * Add a connection task to the queue
   * @param {string} sessionId
   * @param {Function} taskFn - Async function returning the connection
   * @param {number} priority - Higher priority runs first (e.g. user pairing > auto reconnect)
   * @returns {Promise}
   */
  enqueue(sessionId, taskFn, priority = 0) {
    return new Promise((resolve, reject) => {
      // Remove any existing queued task for this session to avoid duplicates
      const existingIdx = this.queue.findIndex(item => item.sessionId === sessionId);
      if (existingIdx !== -1) {
        const [removed] = this.queue.splice(existingIdx, 1);
        removed.reject(new Error(`Tâche remplacée par une nouvelle demande pour la session ${sessionId}`));
      }

      this.queue.push({
        sessionId,
        taskFn,
        priority,
        resolve,
        reject,
        enqueuedAt: Date.now()
      });

      this.stats.queued++;
      this.sortQueue();
      this.processNext();
    });
  }

  sortQueue() {
    this.queue.sort((a, b) => b.priority - a.priority || a.enqueuedAt - b.enqueuedAt);
  }

  async processNext() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.activeWorkers++;
    const item = this.queue.shift();

    try {
      // Small stagger delay between starting concurrent socket handshakes
      if (this.rateLimitDelay > 0) {
        await new Promise(r => setTimeout(r, this.rateLimitDelay));
      }

      const result = await item.taskFn();
      this.stats.processed++;
      item.resolve(result);
    } catch (error) {
      this.stats.failed++;
      item.reject(error);
    } finally {
      this.activeWorkers--;
      // Continue processing next in queue
      setImmediate(() => this.processNext());
    }
  }

  cancel(sessionId) {
    const idx = this.queue.findIndex(item => item.sessionId === sessionId);
    if (idx !== -1) {
      const [removed] = this.queue.splice(idx, 1);
      removed.reject(new Error(`Tâche annulée pour la session ${sessionId}`));
      return true;
    }
    return false;
  }

  clear() {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      item.reject(new Error('File de connexion vidée'));
    }
  }

  getQueueLength() {
    return this.queue.length;
  }

  getActiveWorkers() {
    return this.activeWorkers;
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      activeWorkers: this.activeWorkers,
      concurrency: this.concurrency,
      stats: { ...this.stats }
    };
  }
}

module.exports = ConnectionQueue;
