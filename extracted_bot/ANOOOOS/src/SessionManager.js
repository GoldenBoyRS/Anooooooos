const fs = require('fs');
const path = require('path');
const os = require('os');
const Session = require('./Session');
const ConnectionQueue = require('./ConnectionQueue');

class SessionManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.sessionsDir = options.sessionsDir || path.resolve(__dirname, '..', 'sessions');

    this.maxSessions = Number(options.maxSessions) || Number(process.env.MAX_SESSIONS) || 1000;
    this.maxActiveConnections = Number(options.maxActiveConnections) || Number(process.env.MAX_ACTIVE_CONNECTIONS) || 50;
    this.maxConcurrentReconnects = Number(options.maxConcurrentReconnects) || Number(process.env.MAX_CONCURRENT_RECONNECTS) || 10;
    
    this.queue = new ConnectionQueue({
      concurrency: this.maxConcurrentReconnects,
      rateLimitDelay: Number(process.env.QUEUE_INTERVAL_MS) || 500
    });

    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Strictly sanitize session identifier to prevent path traversal
   */
  sanitizeId(rawId) {
    if (!rawId) return '';
    const cleaned = String(rawId).trim().replace(/[^0-9a-zA-Z_-]/g, '');
    // If it's a phone number, extract digits
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 16) {
      return digitsOnly;
    }
    return cleaned;
  }

  validateSessionDir(sessionId) {
    const targetDir = path.resolve(this.sessionsDir, sessionId);
    const parentDir = path.resolve(this.sessionsDir);
    if (!targetDir.startsWith(parentDir) || targetDir === parentDir) {
      throw new Error('Tentative d’accès à un chemin non autorisé (Path Traversal détecté).');
    }
    return targetDir;
  }

  /**
   * Progressive initialization on server start.
   * Loads metadata for all stored sessions and progressively queues reconnections up to MAX_ACTIVE_CONNECTIONS.
   */
  async init() {
    console.log(`🔄 [SessionManager] Initialisation du gestionnaire multi-session...`);
    console.log(`⚙️ Config: MAX_SESSIONS=${this.maxSessions}, MAX_ACTIVE_CONNECTIONS=${this.maxActiveConnections}, CONCURRENT_WORKERS=${this.maxConcurrentReconnects}`);

    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
      return;
    }

    const entries = fs.readdirSync(this.sessionsDir, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory()).map(e => e.name);

    let registeredCount = 0;
    let scheduledAutoConnect = 0;

    for (const folder of folders) {
      const cleanId = this.sanitizeId(folder);
      if (!cleanId) continue;

      const credsPath = path.join(this.sessionsDir, folder, 'creds.json');
      if (fs.existsSync(credsPath)) {
        registeredCount++;
        // Create session object without immediate socket connection
        const session = new Session(cleanId, {
          sessionId: cleanId,
          sessionsDir: this.sessionsDir,
          manager: this
        });
        session.status = 'disconnected';
        this.sessions.set(cleanId, session);

        // Progressively queue auto-reconnect only up to MAX_ACTIVE_CONNECTIONS
        if (scheduledAutoConnect < this.maxActiveConnections) {
          scheduledAutoConnect++;
          this.queue.enqueue(cleanId, () => session.start(), 0).catch(err => {
            console.warn(`[${cleanId}] Avertissement au démarrage:`, err.message);
          });
        }
      }
    }

    console.log(`✅ [SessionManager] ${this.sessions.size} sessions locales enregistrées (${registeredCount} avec identifiants WhatsApp, ${scheduledAutoConnect} reconnexions en cours).`);
  }

  getActiveConnectionsCount() {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.status === 'open' || session.status === 'connecting' || session.status === 'pairing') {
        count++;
      }
    }
    return count;
  }

  /**
   * Idempotent session creation / acquisition
   */
  async createSession(number, options = {}) {
    const cleanId = this.sanitizeId(number);
    if (!cleanId || cleanId.length < 6) {
      throw new Error('Numéro de téléphone ou identifiant de session invalide.');
    }

    this.validateSessionDir(cleanId);

    // Idempotency: check if already exists
    if (this.sessions.has(cleanId)) {
      const existing = this.sessions.get(cleanId);
      
      if (existing.status === 'open') {
        return existing;
      }
      if (existing.status === 'pairing' || existing.status === 'connecting') {
        return existing;
      }

      // If disconnected/error/loggedOut, restart through queue
      if (['disconnected', 'error', 'loggedOut', 'idle'].includes(existing.status)) {
        console.log(`[${cleanId}] Réactivation de la session existante...`);
        existing.status = 'connecting';
        await this.queue.enqueue(cleanId, () => existing.start(), 2);
        return existing;
      }
    }

    // Check capacity limit
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Capacité maximale atteinte (${this.maxSessions} sessions). Impossible d'enregistrer de nouveau compte.`);
    }

    const session = new Session(cleanId, {
      sessionId: cleanId,
      sessionsDir: this.sessionsDir,
      manager: this
    });

    this.sessions.set(cleanId, session);

    // Check concurrency limit before active start
    const activeCount = this.getActiveConnectionsCount();
    if (activeCount >= this.maxActiveConnections) {
      console.warn(`[${cleanId}] Limite de connexions actives (${this.maxActiveConnections}) atteinte. Mise en file d'attente prioritaire...`);
    }

    // Enqueue start task with high priority (user-initiated)
    await this.queue.enqueue(cleanId, () => session.start(), 3);
    return session;
  }

  getSession(numberOrId) {
    const cleanId = this.sanitizeId(numberOrId);
    return this.sessions.get(cleanId) || null;
  }

  getStatus(numberOrId) {
    const session = this.getSession(numberOrId);
    if (!session) return { status: 'not_found', registered: false };
    return session.getStatus();
  }

  async disconnectSession(numberOrId) {
    const session = this.getSession(numberOrId);
    if (!session) {
      throw new Error(`Session introuvable: ${numberOrId}`);
    }
    this.queue.cancel(session.sessionId);
    return await session.disconnect();
  }

  async reconnectSession(numberOrId) {
    const session = this.getSession(numberOrId);
    if (!session) {
      throw new Error(`Session introuvable: ${numberOrId}`);
    }
    if (session.status === 'open') {
      return { status: 'open', message: 'Déjà connecté' };
    }

    return await this.queue.enqueue(session.sessionId, () => session.start(), 2);
  }

  /**
   * Voluntary definitive deletion:
   * 1. Check authorization / confirm flag.
   * 2. Cancel queue / reconnect timers.
   * 3. Terminate socket and remove listeners.
   * 4. Remove exclusively this session folder.
   * 5. Remove from Map.
   */
  async deleteSession(numberOrId, options = {}) {
    if (!options.confirm) {
      throw new Error('Confirmation explicite requise pour supprimer définitivement une session (confirm: true).');
    }

    const cleanId = this.sanitizeId(numberOrId);
    this.validateSessionDir(cleanId);

    const session = this.sessions.get(cleanId);
    this.queue.cancel(cleanId);

    if (session) {
      await session.delete(options);
      this.sessions.delete(cleanId);
    } else {
      // If folder exists on disk but not in memory
      const targetDir = path.join(this.sessionsDir, cleanId);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    }

    return {
      success: true,
      sessionId: cleanId,
      message: `Session ${cleanId} supprimée définitivement.`
    };
  }

  /**
   * Paginated and filterable list of sessions (designed for 500+ sessions)
   */
  listSessions(options = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(options.limit) || 50));
    const statusFilter = options.status ? String(options.status).toLowerCase() : null;
    const search = options.search ? String(options.search).trim() : null;

    let items = [];
    for (const session of this.sessions.values()) {
      const s = session.getStatus();

      if (statusFilter && s.status !== statusFilter) {
        continue;
      }
      if (search && !s.number.includes(search) && !s.sessionId.includes(search)) {
        continue;
      }

      items.push(s);
    }

    // Sort: open/pairing first, then recent
    items.sort((a, b) => {
      const order = { open: 1, pairing: 2, connecting: 3, reconnecting: 4, disconnected: 5, error: 6, loggedOut: 7 };
      const diff = (order[a.status] || 9) - (order[b.status] || 9);
      if (diff !== 0) return diff;
      return b.lastActiveAt - a.lastActiveAt;
    });

    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = items.slice(startIndex, startIndex + limit);

    return {
      total,
      page,
      limit,
      totalPages,
      sessions: paginated
    };
  }

  getMetrics() {
    const memory = process.memoryUsage();
    let openCount = 0;
    let pairingCount = 0;
    let connectingCount = 0;
    let disconnectedCount = 0;
    let errorCount = 0;
    let loggedOutCount = 0;

    for (const s of this.sessions.values()) {
      if (s.status === 'open') openCount++;
      else if (s.status === 'pairing') pairingCount++;
      else if (s.status === 'connecting' || s.status === 'reconnecting') connectingCount++;
      else if (s.status === 'disconnected') disconnectedCount++;
      else if (s.status === 'error') errorCount++;
      else if (s.status === 'loggedOut') loggedOutCount++;
    }

    return {
      sessions: {
        total: this.sessions.size,
        open: openCount,
        pairing: pairingCount,
        connecting: connectingCount,
        disconnected: disconnectedCount,
        error: errorCount,
        loggedOut: loggedOutCount,
        maxSessions: this.maxSessions,
        maxActiveConnections: this.maxActiveConnections
      },
      queue: this.queue.getStatus(),
      system: {
        rssMB: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMB: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMB: Math.round(memory.heapTotal / (1024 * 1024)),
        uptimeSeconds: Math.round(process.uptime()),
        freeMemMB: Math.round(os.freemem() / (1024 * 1024)),
        totalMemMB: Math.round(os.totalmem() / (1024 * 1024))
      }
    };
  }

  /**
   * Graceful shutdown on SIGTERM / SIGINT:
   * Closes active sockets cleanly without deleting any authentication files!
   */
  async destroy() {
    console.log('🛑 [SessionManager] Arrêt propre de toutes les sessions en cours...');
    this.queue.clear();
    const promises = [];
    for (const session of this.sessions.values()) {
      promises.push(session.disconnect().catch(() => {}));
    }
    await Promise.all(promises);
    console.log('✅ [SessionManager] Toutes les sessions ont été déconnectées sans perte de données.');
  }
}

module.exports = SessionManager;