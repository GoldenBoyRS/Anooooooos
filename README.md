# 𝐀𝐍𝐎𝐒_𝐕𝐎𝐋𝐃𝐈𝐆𝐎𝐀𝐃_𝐌𝐈𝐍𝐈_𝐌𝐃 — Multi-session local

Cette archive regroupe le dossier complet du bot avec les fichiers multi-session déjà présents dans le projet fourni. Les deux archives ZIP imbriquées ont été intégrées au dossier final et retirées en tant qu'archives séparées pour obtenir un seul ZIP propre.

## Structure

- `index.js` / `main.js` : points d'entrée existants
- `commands/` : commandes du bot
- `lib/` : fonctions partagées
- `src/Session.js`, `src/SessionManager.js`, `src/ConnectionQueue.js` : gestion des sessions et des connexions
- `src/server.js` et `public/` : panel web
- `tests/multi_session.test.js` : tests multi-session présents dans le projet
- `sessions/` et `session/` : dossiers liés aux sessions du projet

## Installation

1. Extrais le ZIP.
2. Ouvre le dossier `𝐀𝐍𝐎𝐒_𝐕𝐎𝐋𝐃𝐈𝐆𝐎𝐀𝐃_𝐌𝐈𝐍𝐈_𝐌𝐃` dans ton environnement Node.js.
3. Installe les dépendances avec `npm ci` si le `package-lock.json` est compatible avec ton environnement, sinon `npm install`.
4. Configure les variables nécessaires à partir de `.env.example` si cette version en utilise.
5. Lance les scripts définis dans `package.json`.

## Important
