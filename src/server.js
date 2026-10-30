const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

function createServer(manager) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Rate limiting map for pairing requests (prevent rapid requests for same number)
  const pairingRateLimit = new Map();

  /**
   * Helper: check pairing rate limit
   */
  function isPairRateLimited(number) {
    const last = pairingRateLimit.get(number);
    const now = Date.now();
    if (last && now - last < 5000) {
      return true;
    }
    pairingRateLimit.set(number, now);
    return false;
  }

  /**
   * GET/POST /api/pair - Request pairing code
   */
  const handlePairRequest = async (req, res) => {
    const rawNumber = req.body?.number || req.query?.number;
    if (!rawNumber) {
      return res.status(400).json({ error: 'Numéro de téléphone requis.' });
    }

    const cleanNumber = String(rawNumber).replace(/\D/g, '');
    if (cleanNumber.length < 7 || cleanNumber.length > 16) {
      return res.status(400).json({ error: 'Veuillez saisir un numéro international valide (7 à 16 chiffres).' });
    }

    if (isPairRateLimited(cleanNumber)) {
      return res.status(429).json({ error: 'Trop de requêtes en peu de temps. Veuillez patienter quelques secondes.' });
    }

    try {
      let session = manager.getSession(cleanNumber);

      // If session is already active
      if (session && session.status === 'open') {
        return res.json({ status: 'open', message: 'Session déjà connectée.' });
      }

      if (!session) {
        session = await manager.createSession(cleanNumber);
      } else if (['disconnected', 'error', 'loggedOut', 'idle'].includes(session.status)) {
        await manager.reconnectSession(cleanNumber);
      }

      // Wait for pairing code with a reasonable timeout
      let attempts = 0;
      const maxAttempts = 12; // 12 seconds
      while (!session.pairingCode && session.status !== 'open' && session.status !== 'error' && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
      }

      if (session.status === 'open') {
        return res.json({ status: 'open', message: 'Connecté avec succès.' });
      }

      if (session.pairingCode) {
        return res.json({
          status: 'pairing',
          code: session.pairingCode,
          sessionId: session.sessionId,
          number: session.number
        });
      }

      if (session.status === 'error') {
        return res.status(500).json({
          error: session.lastError || 'Échec de la génération du code de pairage (WhatsApp a rejeté la requête ou le numéro est incorrect).'
        });
      }

      // If still processing
      return res.json({
        status: session.status,
        code: session.pairingCode || null,
        message: 'Génération en cours, vérification du statut...'
      });
    } catch (error) {
      console.error(`[/api/pair] Erreur pour ${cleanNumber}:`, error.message);
      return res.status(500).json({ error: error.message });
    }
  };

  app.get('/api/pair', handlePairRequest);
  app.post('/api/pair', handlePairRequest);

  /**
   * GET /api/status - Get status of a specific session
   */
  app.get('/api/status', (req, res) => {
    const rawNumber = req.query.number || req.query.sessionId;
    if (!rawNumber) return res.status(400).json({ error: 'Numéro ou identifiant requis' });
    const cleanNumber = String(rawNumber).replace(/\D/g, '') || rawNumber;
    res.json(manager.getStatus(cleanNumber));
  });

  /**
   * GET /api/sessions - List sessions with pagination and search
   */
  app.get('/api/sessions', (req, res) => {
    const { page, limit, status, search } = req.query;
    const result = manager.listSessions({ page, limit, status, search });
    res.json(result);
  });

  /**
   * GET /api/session/:id - Get details of one session
   */
  app.get('/api/session/:id', (req, res) => {
    const status = manager.getStatus(req.params.id);
    if (status.status === 'not_found') {
      return res.status(404).json({ error: 'Session non trouvée' });
    }
    res.json(status);
  });

  /**
   * POST /api/session/:id/disconnect - Disconnect gracefully
   */
  app.post('/api/session/:id/disconnect', async (req, res) => {
    try {
      const result = await manager.disconnectSession(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/session/:id/reconnect - Reconnect session
   */
  app.post('/api/session/:id/reconnect', async (req, res) => {
    try {
      await manager.reconnectSession(req.params.id);
      res.json({ ok: true, message: 'Reconnexion mise en file d’attente' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/session/:id/delete or DELETE /api/session/:id - Voluntary deletion
   */
  const handleDeleteSession = async (req, res) => {
    const confirm = req.body?.confirm === true || req.query?.confirm === 'true';
    if (!confirm) {
      return res.status(400).json({
        error: 'Confirmation requise. Spécifiez "confirm: true" pour autoriser la suppression irréversible.'
      });
    }

    try {
      const result = await manager.deleteSession(req.params.id, { confirm: true });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  app.delete('/api/session/:id', handleDeleteSession);
  app.post('/api/session/:id/delete', handleDeleteSession);

  /**
   * GET /api/stats - Live server and session metrics
   */
  app.get('/api/stats', (req, res) => {
    res.json(manager.getMetrics());
  });

  /**
   * POST /api/benchmark - Simulated 500+ session stress test / memory audit
   */
  app.post('/api/benchmark', async (req, res) => {
    try {
      const count = Math.min(1000, Math.max(10, Number(req.body?.count) || 500));
      const startMem = process.memoryUsage();
      const startTime = Date.now();

      // Run isolated mock benchmark
      const BenchmarkRunner = require('./BenchmarkRunner');
      const report = await BenchmarkRunner.runSimulatedBenchmark(count);

      const endMem = process.memoryUsage();
      const durationMs = Date.now() - startTime;

      res.json({
        success: true,
        count,
        durationMs,
        memoryDeltaMB: Math.round((endMem.heapUsed - startMem.heapUsed) / (1024 * 1024)),
        report
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/tests/run - Run the automated test suite
   */
  app.get('/api/tests/run', async (req, res) => {
    try {
      const TestRunner = require('../tests/multi_session.test');
      const results = await TestRunner.runAllTests(manager);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Fallback to panel for single page navigation
   */
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.json({ name: 'ANOS_VOLDIGOAD_MINI_MD', status: 'running' });
    }
  });

  return app;
}

module.exports = createServer;