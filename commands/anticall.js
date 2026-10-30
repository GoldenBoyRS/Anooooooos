const fs = require('fs');

const ANTICALL_PATH = './data/anticall.json';
const NEWSLETTER_JID = '120363422530463919@newsletter';
const NEWSLETTER_NAME = '𝐀𝐍𝐎𝐒_𝐕𝐎𝐋𝐃𝐈𝐆𝐎𝐀𝐃_𝐌𝐈𝐍𝐈_𝐌𝐃';

// Fonction pour envoyer un message avec ta newsletter
const sendMsg = (sock, chatId, text, quoted) => {
    return sock.sendMessage(chatId, {
        text: text,
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: NEWSLETTER_JID,
                newsletterName: NEWSLETTER_NAME,
                serverMessageId: -1
            }
        }
    }, { quoted });
};

function readState() {
    try {
        if (!fs.existsSync(ANTICALL_PATH)) return { enabled: false };
        const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');
        return { enabled: !!data.enabled };
    } catch {
        return { enabled: false };
    }
}

function writeState(enabled) {
    try {
        if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
        fs.writeFileSync(ANTICALL_PATH, JSON.stringify({ enabled: !!enabled }, null, 2));
    } catch {}
}

async function anticallCommand(sock, chatId, message, args) {
    const state = readState();
    const sub = (args || '').trim().toLowerCase();

    if (!sub || (sub !== 'on' && sub !== 'off' && sub !== 'status')) {
        await sendMsg(sock, chatId, '*ANTICALL*\n\n.anticall on  - Activer le blocage des appels\n.anticall off - Désactiver\n.anticall status - Voir l\'état', message);
        return;
    }

    if (sub === 'status') {
        await sendMsg(sock, chatId, `Anticall est actuellement *${state.enabled ? 'ON' : 'OFF'}*.`, message);
        return;
    }

    const enable = sub === 'on';
    writeState(enable);
    await sendMsg(sock, chatId, `Anticall est maintenant *${enable ? 'ACTIVÉ' : 'DÉSACTIVÉ'}*.`, message);
}

module.exports = { anticallCommand, readState };