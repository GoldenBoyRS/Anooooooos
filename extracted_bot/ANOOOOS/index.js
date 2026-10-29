const fs = require('fs');
const path = require('path');
const SessionManager = require('./src/SessionManager');
const createServer = require('./src/server');

async function start() {
  const sessionsDir = path.resolve(__dirname, 'sessions');
  fs.mkdirSync(sessionsDir, { recursive: true });

  const manager = new SessionManager({ sessionsDir });
  await manager.init();

  const app = createServer(manager);
  const port = Number(process.env.PORT) || 20356;
  
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 [ANOS VOLDIGOAD MULTI] Panel Web disponible sur le port ${port}`);
    console.log(`📊 Limite configurée: MAX_SESSIONS=${manager.maxSessions}, MAX_ACTIVE_CONNECTIONS=${manager.maxActiveConnections}`);
  });

  // Optional GC every 5 minutes if node is run with --expose-gc
  setInterval(() => {
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (_) {}
    }
  }, 5 * 60 * 1000);

  // Graceful shutdown on SIGTERM / SIGINT: preserves all sessions without data loss
  const shutdown = async (signal) => {
    console.log(`\n🛑 Signal ${signal} reçu. Arrêt propre du serveur et des sessions...`);
    try {
      server.close();
      await manager.destroy();
      console.log('✅ Arrêt propre terminé. Données locales préservées.');
      process.exit(0);
    } catch (err) {
      console.error('Erreur lors de l’arrêt:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('Erreur fatale au démarrage du serveur:', error);
  process.exitCode = 1;
});

process.on('uncaughtException', (error) => {
  // Prevent single isolated socket error from crashing entire multi-session bot
  console.error('⚠️ [Avertissement] Exception non interceptée capturée:', error?.message || error);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Avertissement] Rejet de promesse non géré:', reason?.message || reason);
});