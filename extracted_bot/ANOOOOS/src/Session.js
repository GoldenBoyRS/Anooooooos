const path = require('path');
const fs = require('fs');
const pino = require('pino');
const NodeCache = require('node-cache');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidDecode
} = require('@whiskeysockets/baileys');

let handleMessages, handleGroupParticipantUpdate, handleStatus;
try {
  const mainModule = require('../main');
  handleMessages = mainModule.handleMessages;
  handleGroupParticipantUpdate = mainModule.handleGroupParticipantUpdate;
  handleStatus = mainModule.handleStatus;
} catch (e) {
  // Fallbacks for testing environments where main is stubbed
  handleMessages = async () => {};
  handleGroupParticipantUpdate = async () => {};
  handleStatus = async () => {};
}

let readAnticallState;
try {
  readAnticallState = require('../commands/anticall').readState;
} catch (e) {
  readAnticallState = () => ({ enabled: false });
}

class Session {
  constructor(number, options = {}) {
    this.rawNumber = String(number || '');
    this.number = this.rawNumber.replace(/\D/g, '');
    this.sessionId = options.sessionId || this.number;
    this.sessionsDir = options.sessionsDir || path.join(process.cwd(), 'sessions');
    this.sessionDir = path.join(this.sessionsDir, this.sessionId);
    this.manager = options.manager || null;
    
    this.status = 'idle'; // idle | pairing | connecting | open | disconnected | reconnecting | loggedOut | error | deleting
    this.pairingCode = null;
    this.qrCode = null;
    this.sock = null;
    this.startPromise = null;
    this.reconnectTimer = null;
    this.pairingTimeoutTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = Number(options.maxReconnectAttempts) || Number(process.env.MAX_RECONNECT_ATTEMPTS) || 10;
    
    this.createdAt = Date.now();
    this.lastActiveAt = Date.now();
    this.connectedAt = null;
    this.lastError = null;

    this.ensureSessionDir();
    this.loadMetadata();
  }

  ensureSessionDir() {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  loadMetadata() {
    try {
      const metaPath = path.join(this.sessionDir, 'session_meta.json');
      if (fs.existsSync(metaPath)) {
        const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (data.createdAt) this.createdAt = data.createdAt;
        if (data.lastActiveAt) this.lastActiveAt = data.lastActiveAt;
        if (data.connectedAt) this.connectedAt = data.connectedAt;
      }
    } catch (_) {}
  }

  saveMetadata() {
    try {
      this.ensureSessionDir();
      const metaPath = path.join(this.sessionDir, 'session_meta.json');
      const data = {
        sessionId: this.sessionId,
        number: this.number,
        createdAt: this.createdAt,
        lastActiveAt: this.lastActiveAt,
        connectedAt: this.connectedAt,
        status: this.status
      };
      fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
    } catch (_) {}
  }

  hasCredentials() {
    try {
      const credsPath = path.join(this.sessionDir, 'creds.json');
      return fs.existsSync(credsPath);
    } catch {
      return false;
    }
  }

  async start() {
    if (this.status === 'deleting') {
      throw new Error(`La session [${this.sessionId}] est en cours de suppression.`);
    }

    if (this.sock && this.status === 'open') {
      return this;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this._start();
    try {
      const res = await this.startPromise;
      return res;
    } catch (error) {
      this.status = 'error';
      this.lastError = error.message;
      throw error;
    } finally {
      this.startPromise = null;
    }
  }

  async _start() {
    if (!this.number || this.number.length < 6) {
      throw new Error(`Numéro de téléphone invalide: ${this.rawNumber}`);
    }

    this.ensureSessionDir();

    // Clean existing socket if any prior instance exists
    this.cleanupSocket(false);

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
    let version = [2, 3000, 1015901307];
    try {
      const versionResult = await fetchLatestBaileysVersion();
      if (versionResult?.version) version = versionResult.version;
    } catch (_) {
      // Fallback version if offline or network timeout
    }

    const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
    const msgRetryCounterCache = new NodeCache({ stdTTL: 300, maxKeys: 1000 });

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      browser: ['Anos-Voldigoad', 'Chrome', '124.0.0.0'],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      markOnlineOnConnect: false, // Low CPU/network footprint
      generateHighQualityLinkPreview: false,
      syncFullHistory: false, // CRITICAL: Never download entire history for 500+ accounts!
      getMessage: async () => '',
      msgRetryCounterCache,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000
    });

    this.sock = sock;
    sock.sessionId = this.sessionId;
    sock.sessionNumber = this.number;
    sock.sessionDir = this.sessionDir;
    sock.public = true;

    this.status = state.creds.registered ? 'connecting' : 'pairing';

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
        this.saveMetadata();
      } catch (err) {
        console.error(`[${this.sessionId}] Erreur lors de la sauvegarde des identifiants:`, err.message);
      }
    });

    sock.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        const decoded = jidDecode(jid) || {};
        return decoded.user && decoded.server ? decoded.user + '@' + decoded.server : jid;
      }
      return jid;
    };

    // Pairing code generation if not already registered
    if (!state.creds.registered) {
      this.requestPairing(sock);
    }

    sock.ev.on('connection.update', async (update) => {
      await this.handleConnectionUpdate(update, state);
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
      this.lastActiveAt = Date.now();
      try {
        const mek = chatUpdate.messages && chatUpdate.messages[0];
        if (!mek || !mek.message) return;
        if (Object.keys(mek.message)[0] === 'ephemeralMessage') {
          mek.message = mek.message.ephemeralMessage.message;
        }
        if (mek.key && mek.key.remoteJid === 'status@broadcast') {
          if (typeof handleStatus === 'function') await handleStatus(sock, chatUpdate);
          return;
        }
        if (mek.key && mek.key.id && mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) {
          return;
        }
        if (typeof handleMessages === 'function') {
          await handleMessages(sock, chatUpdate, false);
        }
      } catch (error) {
        console.error(`[${this.sessionId}] Erreur messages.upsert:`, error.message);
      }
    });

    sock.ev.on('call', async (calls) => {
      this.lastActiveAt = Date.now();
      try {
        const anticallState = readAnticallState();
        if (!anticallState.enabled) return;

        for (const call of calls) {
          const callJid = call.chatId || call.peerJid || call.from;
          if (!callJid || call.status !== 'offer') continue;
          try {
            await sock.rejectCall(call.id, callJid);
            await sock.sendMessage(callJid, { text: '📵 Anticall is enabled. Your call was rejected.' });
            await sock.updateBlockStatus(callJid, 'block');
          } catch (_) {}
        }
      } catch (err) {
        console.error(`[${this.sessionId}] Erreur call handler:`, err.message);
      }
    });

    sock.ev.on('group-participants.update', async (update) => {
      this.lastActiveAt = Date.now();
      try {
        if (typeof handleGroupParticipantUpdate === 'function') {
          await handleGroupParticipantUpdate(sock, update);
        }
      } catch (_) {}
    });

    return this;
  }

  requestPairing(sock) {
    if (this.pairingTimeoutTimer) {
      clearTimeout(this.pairingTimeoutTimer);
    }

    this.pairingTimeoutTimer = setTimeout(async () => {
      if (this.sock !== sock || sock.authState?.creds?.registered || this.status === 'deleting') {
        return;
      }

      try {
        let code = await sock.requestPairingCode(this.number);
        this.pairingCode = code && code.match(/.{1,4}/g) ? code.match(/.{1,4}/g).join('-') : code;
        this.status = 'pairing';
        console.log(`[${this.sessionId}] Code d'association généré : ${this.pairingCode}`);
      } catch (error) {
        // IMPORTANT: Do NOT delete credentials or folder on pairing error!
        this.status = 'error';
        this.lastError = `Échec de pairage: ${error.message}`;
        console.error(`[${this.sessionId}] Erreur de génération du code d'association:`, error.message);
      }
    }, 2500);
  }

  async handleConnectionUpdate(update, state) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.qrCode = qr;
    }

    if (connection === 'connecting') {
      if (this.status !== 'pairing' || state.creds.registered) {
        this.status = 'connecting';
      }
    }

    if (connection === 'open') {
      this.status = 'open';
      this.pairingCode = null;
      this.qrCode = null;
      this.reconnectAttempts = 0;
      this.lastError = null;
      this.connectedAt = Date.now();
      this.lastActiveAt = Date.now();
      this.saveMetadata();
      console.log(`[${this.sessionId}] Connexion WhatsApp établie avec succès.`);

      // Optional newsletter/group joins done safely with timeout
      setTimeout(async () => {
        if (this.sock && this.status === 'open') {
          try {
            await this.sock.newsletterFollow('0029VbC8KUk2kNFp2Fb0bF3J@newsletter');
          } catch (_) {}
        }
      }, 5000);
    }

    if (connection === 'close') {
      this.connectedAt = null;
      const error = lastDisconnect && lastDisconnect.error;
      const statusCode = error && error.output && error.output.statusCode;

      console.log(`[${this.sessionId}] Connexion fermée (Code: ${statusCode || 'inconnu'})`);

      // A. Permanent Logout confirmed by WhatsApp
      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        this.status = 'loggedOut';
        this.lastError = 'Déconnecté définitivement par WhatsApp (appareil délié).';
        console.log(`[${this.sessionId}] Déconnexion définitive confirmée.`);
        
        this.cleanupSocket(false);

        // Only remove auth files if account was actually registered and was permanently logged out
        if (state.creds.registered) {
          try {
            this.purgeAuthFiles();
            console.log(`[${this.sessionId}] Identifiants locaux révoqués supprimés.`);
          } catch (e) {
            console.error(`[${this.sessionId}] Erreur suppression auth révoquée:`, e.message);
          }
        }
        return;
      }

      // B. Voluntary deletion in progress
      if (this.status === 'deleting') {
        this.cleanupSocket(false);
        return;
      }

      // C. Temporary network failure or server restart
      // NEVER delete auth files on temporary failure!
      this.status = 'disconnected';
      this.scheduleReconnect(statusCode);
    }
  }

  calculateBackoff() {
    // Exponential backoff with jitter: 2s, 4s, 8s, 16s, 32s, max 60s
    const baseDelay = 2000;
    const maxDelay = 60000;
    const exponent = Math.min(this.reconnectAttempts, 6);
    const delay = Math.min(maxDelay, baseDelay * Math.pow(1.5, exponent));
    const jitter = Math.floor(Math.random() * 1500);
    return Math.floor(delay + jitter);
  }

  scheduleReconnect(statusCode) {
    if (this.reconnectTimer || this.status === 'deleting' || this.status === 'loggedOut') {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.status = 'disconnected';
      this.lastError = `Limite de tentatives de reconnexion atteinte (${this.maxReconnectAttempts}). Cliquez sur Reconnecter dans le panel.`;
      console.warn(`[${this.sessionId}] ${this.lastError}`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.calculateBackoff();
    this.status = 'reconnecting';
    console.log(`[${this.sessionId}] Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${(delay/1000).toFixed(1)}s (Raison: ${statusCode || 'temp'})...`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.status === 'deleting' || this.status === 'loggedOut') return;

      try {
        if (this.manager && this.manager.queue) {
          await this.manager.queue.enqueue(this.sessionId, () => this.start(), 1);
        } else {
          await this.start();
        }
      } catch (err) {
        console.error(`[${this.sessionId}] Échec de la reconnexion automatique:`, err.message);
      }
    }, delay);
  }

  /**
   * Graceful manual disconnection: keeps authentication files intact.
   */
  async disconnect() {
    this.status = 'disconnected';
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pairingTimeoutTimer) {
      clearTimeout(this.pairingTimeoutTimer);
      this.pairingTimeoutTimer = null;
    }
    this.cleanupSocket(true);
    this.saveMetadata();
    console.log(`[${this.sessionId}] Session déconnectée manuellement (identifiants conservés).`);
    return { ok: true, status: this.status };
  }

  /**
   * Voluntary definitive deletion: removes socket and only this session's folder.
   */
  async delete(options = {}) {
    this.status = 'deleting';

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pairingTimeoutTimer) {
      clearTimeout(this.pairingTimeoutTimer);
      this.pairingTimeoutTimer = null;
    }

    // Terminate socket connection
    this.cleanupSocket(true);

    // Purge exclusively this session's directory
    await new Promise(r => setTimeout(r, 300));
    this.purgeAuthFiles();

    console.log(`[${this.sessionId}] Session et stockage local supprimés proprement.`);
    return { ok: true, deleted: true, sessionId: this.sessionId };
  }

  purgeAuthFiles() {
    if (fs.existsSync(this.sessionDir)) {
      // Validate that sessionDir is strictly inside sessionsDir to avoid any path traversal
      const resolvedTarget = path.resolve(this.sessionDir);
      const resolvedParent = path.resolve(this.sessionsDir);
      if (resolvedTarget.startsWith(resolvedParent) && resolvedTarget !== resolvedParent) {
        fs.rmSync(resolvedTarget, { recursive: true, force: true });
      }
    }
  }

  cleanupSocket(terminateWs = true) {
    if (this.sock) {
      try {
        if (this.sock.ev) {
          this.sock.ev.removeAllListeners();
        }
        if (terminateWs) {
          if (this.sock.ws && typeof this.sock.ws.close === 'function') {
            this.sock.ws.close();
          }
          if (typeof this.sock.end === 'function') {
            this.sock.end(undefined);
          }
        }
      } catch (_) {}
      this.sock = null;
    }
  }

  getStatus() {
    return {
      sessionId: this.sessionId,
      number: this.number,
      status: this.status,
      code: this.pairingCode,
      hasQr: !!this.qrCode,
      registered: this.hasCredentials(),
      createdAt: this.createdAt,
      lastActiveAt: this.lastActiveAt,
      connectedAt: this.connectedAt,
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastError
    };
  }
}

module.exports = Session;