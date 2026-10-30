const settings = require("../settings");

async function aliveCommand(sock, chatId, message) {
    try {
        const version = settings?.version ? settings.version : "3.0.7";
        const mode = settings?.commandMode ? settings.commandMode : "private";

        const message1 = `
╭─────❏ ANOS_VOLDIGOAD MINI-MD
│ 📈 Alive!* ✅
│ .𖥔 ANOS_VOLDIGOAD MINI-MD    
│
│ \`Version\` : v${version} 📉
│ \`Statut\` : En ligne 🟢
│ \`Mode\` : ${mode} 🌐
│
│ \`🖱️ Fonctions\`
│ • Gestion de groupes 👥
│ • Protection anti-lien 🔒
│ • Commandes admin ⚖️
│ • Commandes fun 🫟
│ • Et plus encore 📦
│
│ Tape *.menu* pour voir la liste des commandes disponibles.
╰──────❏
›  • \`GOLDENBOY DEV\`
`.trim();

        await sock.sendMessage(chatId, {
            text: message1,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363422530463919@newsletter',
                    newsletterName: 'ANOS_VOLDIGOAD MINI-MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });

    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { text: 'Le bot est en ligne ✅' }, { quoted: message });
        return;
    }
}

module.exports = aliveCommand;