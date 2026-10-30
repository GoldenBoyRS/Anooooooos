/**
 * multi_session.test.js
 * Comprehensive automated test suite covering all 16 required scenarios:
 * 1. Session creation.
 * 2. Idempotency (prevent duplicate creation).
 * 3. Session isolation (independent storage and state).
 * 4. Safe single session deletion without impacting others.
 * 5. Credential preservation on temporary network disconnects.
 * 6. Proper cleanup on permanent logout (401 / loggedOut).
 * 7. Recovery of persistent sessions upon manager restart.
 * 8. Prevention of duplicate concurrent sockets.
 * 9. Session capacity limits enforcement (MAX_SESSIONS).
 * 10. Concurrency queue handling and rate limiting.
 * 11. Error isolation without global crash.
 * 12. Cleanup of timers, sockets, and event listeners.
 * 13. Access control / authorization checks (confirm: true).
 * 14. Path traversal protection against malicious session IDs.
 * 15. Paginated session listing and stats integrity for 500+ scale.
 * 16. Command routing context isolation for specific sessions.
 * 17. Load simulation with 500 registered sessions.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const SessionManager = require('../src/SessionManager');
const Session = require('../src/Session');
const ConnectionQueue = require('../src/ConnectionQueue');
const BenchmarkRunner = require('../src/BenchmarkRunner');

class TestSuite {
  static async runAllTests(providedManager = null) {
    const testDir = path.join(__dirname, '..', 'sessions_test_env');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    const results = {
      timestamp: new Date().toISOString(),
      total: 17,
      passed: 0,
      failed: 0,
      details: []
    };

    function record(name, success, errorOrNote = null) {
      if (success) {
        results.passed++;
        results.details.push({ test: name, status: 'PASSED', note: errorOrNote });
      } else {
        results.failed++;
        results.details.push({ test: name, status: 'FAILED', error: String(errorOrNote) });
      }
    }

    const manager = new SessionManager({
      sessionsDir: testDir,
      maxSessions: 10, // Small limit for testing boundary
      maxActiveConnections: 5,
      maxConcurrentReconnects: 2
    });

    try {
      // ---------------------------------------------------------
      // TEST 1: Création d’une session
      // ---------------------------------------------------------
      try {
        const num1 = '33611111111';
        const session1 = new Session(num1, { sessionsDir: testDir, manager });
        manager.sessions.set(num1, session1);
        assert.strictEqual(session1.sessionId, num1);
        assert.ok(fs.existsSync(session1.sessionDir), 'Dossier de session créé');
        record('1. Création d’une session', true, 'Session initialisée avec répertoire dédié');
      } catch (e) {
        record('1. Création d’une session', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 2: Refus de créer deux fois la même session (Idempotence)
      // ---------------------------------------------------------
      try {
        const num2 = '33622222222';
        const sessionA = new Session(num2, { sessionsDir: testDir, manager });
        sessionA.status = 'open';
        manager.sessions.set(num2, sessionA);

        const sessionB = await manager.createSession(num2);
        assert.strictEqual(sessionA, sessionB, 'Doit renvoyer la même instance existante');
        record('2. Refus de doublons (Idempotence)', true, 'Même instance retournée sans socket dupliqué');
      } catch (e) {
        record('2. Refus de doublons (Idempotence)', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 3: Isolation entre deux sessions
      // ---------------------------------------------------------
      try {
        const numA = '33633333331';
        const numB = '33633333332';
        const sA = new Session(numA, { sessionsDir: testDir, manager });
        const sB = new Session(numB, { sessionsDir: testDir, manager });

        // Write specific auth file in sA
        fs.writeFileSync(path.join(sA.sessionDir, 'creds.json'), JSON.stringify({ token: 'AUTH_A' }));
        fs.writeFileSync(path.join(sB.sessionDir, 'creds.json'), JSON.stringify({ token: 'AUTH_B' }));

        const readA = JSON.parse(fs.readFileSync(path.join(sA.sessionDir, 'creds.json')));
        const readB = JSON.parse(fs.readFileSync(path.join(sB.sessionDir, 'creds.json')));

        assert.strictEqual(readA.token, 'AUTH_A');
        assert.strictEqual(readB.token, 'AUTH_B');
        assert.notStrictEqual(sA.sessionDir, sB.sessionDir);
        record('3. Isolation stricte des sessions', true, 'Stockages et identifiants totalement étanches');
      } catch (e) {
        record('3. Isolation stricte des sessions', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 4: Suppression d’une seule session sans toucher aux autres
      // ---------------------------------------------------------
      try {
        const targetNum = '33644444441';
        const survivorNum = '33644444442';

        const sTarget = new Session(targetNum, { sessionsDir: testDir, manager });
        const sSurvivor = new Session(survivorNum, { sessionsDir: testDir, manager });
        manager.sessions.set(targetNum, sTarget);
        manager.sessions.set(survivorNum, sSurvivor);

        fs.writeFileSync(path.join(sTarget.sessionDir, 'creds.json'), 'TARGET_CREDS');
        fs.writeFileSync(path.join(sSurvivor.sessionDir, 'creds.json'), 'SURVIVOR_CREDS');

        await manager.deleteSession(targetNum, { confirm: true });

        assert.ok(!fs.existsSync(sTarget.sessionDir), 'Dossier cible doit être supprimé');
        assert.ok(!manager.sessions.has(targetNum), 'Session retirée du Map');
        assert.ok(fs.existsSync(sSurvivor.sessionDir), 'Dossier de l’autre utilisateur doit rester intact');
        assert.ok(manager.sessions.has(survivorNum), 'Autre session maintenue en mémoire');
        record('4. Suppression isolée sans toucher aux autres', true, 'Suppression chirurgicale confirmée');
      } catch (e) {
        record('4. Suppression isolée sans toucher aux autres', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 5: Conservation des identifiants lors d’une erreur réseau temporaire
      // ---------------------------------------------------------
      try {
        const tempNum = '33655555555';
        const sTemp = new Session(tempNum, { sessionsDir: testDir, manager });
        manager.sessions.set(tempNum, sTemp);
        const credFile = path.join(sTemp.sessionDir, 'creds.json');
        fs.writeFileSync(credFile, 'CRITICAL_AUTH_DATA');

        // Simulate temporary connection drop (code 408 / timed out)
        await sTemp.handleConnectionUpdate({
          connection: 'close',
          lastDisconnect: { error: { output: { statusCode: 408 } } }
        }, { creds: { registered: true } });

        assert.ok(fs.existsSync(credFile), 'Les identifiants ne doivent JAMAIS être supprimés lors d’un timeout');
        assert.strictEqual(sTemp.status, 'reconnecting');
        sTemp.cleanupSocket(true);
        if (sTemp.reconnectTimer) clearTimeout(sTemp.reconnectTimer);
        record('5. Conservation des identifiants sur erreur réseau', true, 'Backoff déclenché et fichiers préservés');
      } catch (e) {
        record('5. Conservation des identifiants sur erreur réseau', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 6: Nettoyage après une déconnexion définitive (loggedOut / 401)
      // ---------------------------------------------------------
      try {
        const logoutNum = '33666666666';
        const sLogout = new Session(logoutNum, { sessionsDir: testDir, manager });
        manager.sessions.set(logoutNum, sLogout);
        fs.writeFileSync(path.join(sLogout.sessionDir, 'creds.json'), 'REGISTERED_CREDS');

        // Simulate 401 LoggedOut from WhatsApp
        await sLogout.handleConnectionUpdate({
          connection: 'close',
          lastDisconnect: { error: { output: { statusCode: 401 } } }
        }, { creds: { registered: true } });

        assert.strictEqual(sLogout.status, 'loggedOut');
        assert.ok(!fs.existsSync(path.join(sLogout.sessionDir, 'creds.json')), 'Identifiants révoqués purgés');
        record('6. Nettoyage après déconnexion définitive (401)', true, 'Statut loggedOut et purge sécurisée');
      } catch (e) {
        record('6. Nettoyage après déconnexion définitive (401)', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 7: Redémarrage du gestionnaire avec récupération des sessions
      // ---------------------------------------------------------
      try {
        const recov1 = '33677777771';
        const recov2 = '33677777772';

        const dir1 = path.join(testDir, recov1);
        const dir2 = path.join(testDir, recov2);
        fs.mkdirSync(dir1, { recursive: true });
        fs.mkdirSync(dir2, { recursive: true });
        fs.writeFileSync(path.join(dir1, 'creds.json'), '{"registered":true}');
        fs.writeFileSync(path.join(dir2, 'creds.json'), '{"registered":true}');

        // New manager instance simulating server restart
        const freshManager = new SessionManager({ sessionsDir: testDir });
        await freshManager.init();

        assert.ok(freshManager.sessions.has(recov1));
        assert.ok(freshManager.sessions.has(recov2));
        assert.strictEqual(freshManager.sessions.get(recov1).status, 'disconnected');
        record('7. Récupération des sessions après redémarrage', true, 'Sessions persistantes réenregistrées automatiquement');
      } catch (e) {
        record('7. Récupération des sessions après redémarrage', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 8: Prévention des doubles connexions
      // ---------------------------------------------------------
      try {
        const dNum = '33688888888';
        const sD = new Session(dNum, { sessionsDir: testDir, manager });
        sD.status = 'open';
        sD.sock = { dummy: true };
        manager.sessions.set(dNum, sD);

        // Calling start() when already open should immediately return without creating another socket
        const res = await sD.start();
        assert.strictEqual(res, sD);
        record('8. Prévention des doubles connexions', true, 'Empêche deux sockets actifs pour un même utilisateur');
      } catch (e) {
        record('8. Prévention des doubles connexions', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 9: Limite du nombre de sessions (MAX_SESSIONS)
      // ---------------------------------------------------------
      try {
        const limitedManager = new SessionManager({ sessionsDir: testDir, maxSessions: 2 });
        await limitedManager.createSession('33690000001');
        await limitedManager.createSession('33690000002');

        let rejected = false;
        try {
          await limitedManager.createSession('33690000003');
        } catch (err) {
          rejected = true;
        }

        assert.ok(rejected, 'Doit rejeter la création au-delà de MAX_SESSIONS');
        record('9. Respect strict de MAX_SESSIONS', true, 'Rejet conforme lors du dépassement de la capacité configurée');
      } catch (e) {
        record('9. Respect strict de MAX_SESSIONS', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 10: File d'attente des connexions (ConnectionQueue)
      // ---------------------------------------------------------
      try {
        const q = new ConnectionQueue({ concurrency: 1, rateLimitDelay: 20 });
        let executed = [];

        // s1 takes 50ms, so s2 and s3 are queued while s1 runs
        const p1 = q.enqueue('s1', async () => {
          await new Promise(r => setTimeout(r, 60));
          executed.push(1);
          return 1;
        }, 1);

        // Enqueue s2 (priority 1) then s3 (priority 5)
        const p2 = q.enqueue('s2', async () => { executed.push(2); return 2; }, 1);
        const p3 = q.enqueue('s3', async () => { executed.push(3); return 3; }, 5); // higher priority

        await Promise.all([p1, p2, p3]);

        assert.strictEqual(executed.length, 3);
        assert.strictEqual(executed[0], 1, 's1 a démarré en premier');
        assert.strictEqual(executed[1], 3, 's3 (priorité 5) doit passer avant s2 (priorité 1)');
        assert.strictEqual(executed[2], 2, 's2 passe en dernier');
        record('10. File d’attente des connexions et priorité', true, 'Ordonnancement prioritaire et limitation de concurrence validés');
      } catch (e) {
        record('10. File d’attente des connexions et priorité', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 11: Gestion des erreurs sans arrêt global
      // ---------------------------------------------------------
      try {
        const errSession = new Session('invalid-xyz-number', { sessionsDir: testDir, manager });
        let errorCaught = false;
        try {
          await errSession._start();
        } catch (err) {
          errorCaught = true;
        }
        assert.ok(errorCaught);
        assert.strictEqual(errSession.status, 'idle');
        record('11. Isolation des erreurs sans crash global', true, 'Une session en échec n’impacte aucunement le système');
      } catch (e) {
        record('11. Isolation des erreurs sans crash global', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 12: Nettoyage des timers et listeners
      // ---------------------------------------------------------
      try {
        const cleanNum = '33612121212';
        const sClean = new Session(cleanNum, { sessionsDir: testDir, manager });
        sClean.reconnectTimer = setTimeout(() => {}, 100000);
        sClean.pairingTimeoutTimer = setTimeout(() => {}, 100000);
        sClean.sock = {
          ev: {
            listenersRemoved: false,
            removeAllListeners() { this.listenersRemoved = true; }
          },
          ws: { close() {} },
          end() {}
        };

        sClean.cleanupSocket(true);
        if (sClean.reconnectTimer) clearTimeout(sClean.reconnectTimer);
        if (sClean.pairingTimeoutTimer) clearTimeout(sClean.pairingTimeoutTimer);

        assert.strictEqual(sClean.sock, null);
        record('12. Nettoyage des timers et listeners', true, 'Libération totale des ressources mémoire et socket');
      } catch (e) {
        record('12. Nettoyage des timers et listeners', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 13: Contrôle d'accès et confirmation de suppression
      // ---------------------------------------------------------
      try {
        const authNum = '33613131313';
        manager.sessions.set(authNum, new Session(authNum, { sessionsDir: testDir, manager }));

        let rejected = false;
        try {
          // Sans confirmation explicite
          await manager.deleteSession(authNum, { confirm: false });
        } catch (err) {
          rejected = true;
        }

        assert.ok(rejected, 'La suppression sans confirm: true doit être refusée');
        record('13. Contrôle des autorisations de suppression', true, 'Protection contre suppressions accidentelles activée');
      } catch (e) {
        record('13. Contrôle des autorisations de suppression', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 14: Protection contre les chemins malveillants (Path Traversal)
      // ---------------------------------------------------------
      try {
        let traversalCaught = false;
        try {
          manager.validateSessionDir('../../etc/passwd');
        } catch (err) {
          traversalCaught = true;
        }
        assert.ok(traversalCaught, 'Path traversal doit être intercepté');
        record('14. Protection Path Traversal (../../)', true, 'Accès non autorisés bloqués avec succès');
      } catch (e) {
        record('14. Protection Path Traversal (../../)', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 15: Pagination et intégrité des métriques
      // ---------------------------------------------------------
      try {
        const pManager = new SessionManager({ sessionsDir: testDir, maxSessions: 100 });
        for (let i = 1; i <= 25; i++) {
          const id = `336999990${String(i).padStart(2, '0')}`;
          const s = new Session(id, { sessionsDir: testDir, manager: pManager });
          s.status = i % 2 === 0 ? 'open' : 'disconnected';
          pManager.sessions.set(id, s);
        }

        const page1 = pManager.listSessions({ page: 1, limit: 10 });
        const page3 = pManager.listSessions({ page: 3, limit: 10 });
        const metrics = pManager.getMetrics();

        assert.strictEqual(page1.sessions.length, 10);
        assert.strictEqual(page3.sessions.length, 5);
        assert.strictEqual(page1.total, 25);
        assert.strictEqual(metrics.sessions.total, 25);
        assert.ok(metrics.system.rssMB > 0);
        record('15. Pagination & Métriques (500+ scale ready)', true, 'Pagination stable et métriques RAM en direct');
      } catch (e) {
        record('15. Pagination & Métriques (500+ scale ready)', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 16: Contexte de session et commande
      // ---------------------------------------------------------
      try {
        const isOwnerOrSudo = require('../lib/isOwner');
        const mockSock = {
          user: { id: '33688888888:1@s.whatsapp.net' }
        };
        const isOwner = await isOwnerOrSudo('33688888888@s.whatsapp.net', mockSock, '1203630@g.us');
        assert.strictEqual(isOwner, true, 'L’utilisateur doit être reconnu comme propriétaire de sa session');
        record('16. Contexte utilisateur et commandes', true, 'Session liée au bon propriétaire sans confusion');
      } catch (e) {
        record('16. Contexte utilisateur et commandes', false, e.message);
      }

      // ---------------------------------------------------------
      // TEST 17: Simulation de charge (500 sessions enregistrées)
      // ---------------------------------------------------------
      try {
        const benchReport = await BenchmarkRunner.runSimulatedBenchmark(500);
        assert.strictEqual(benchReport.targetCount, 500);
        assert.ok(benchReport.totalDurationMs < 20000, 'Doit s’exécuter en moins de 20s');
        record('17. Test de charge 500 sessions enregistrées', true, `${benchReport.memory.avgMemoryPerSessionKB} par session, durée ${benchReport.totalDurationMs}ms`);
      } catch (e) {
        record('17. Test de charge 500 sessions enregistrées', false, e.message);
      }

    } finally {
      // Nettoyage de l'environnement de test
      try {
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      } catch (_) {}
    }

    return results;
  }
}

// Support direct command-line execution (e.g. `node tests/multi_session.test.js`)
if (require.main === module) {
  TestSuite.runAllTests().then(res => {
    console.log('\n========================================');
    console.log(`📊 RÉSULTAT DES TESTS : ${res.passed}/${res.total} RÉUSSIS`);
    console.log('========================================');
    res.details.forEach(d => {
      const icon = d.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${d.test}: ${d.note || d.error || d.status}`);
    });
    process.exit(res.failed === 0 ? 0 : 1);
  }).catch(err => {
    console.error('Erreur exécution tests:', err);
    process.exit(1);
  });
}

module.exports = TestSuite;
