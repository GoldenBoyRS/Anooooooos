const isAdmin = require('../lib/isAdmin');
const { channelInfo } = require('../lib/messageConfig');

async function kickallCommand(sock, chatId, senderId, message) {
    try {
        // 1. Vérifier que c'est un groupe
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette commande ne peut être utilisée que dans un groupe.',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        // 2. Vérifier que le sender est admin et que le bot est admin
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, {
                text: '❌ Je dois être *admin* pour expulser des membres.',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, {
                text: '❌ Seuls les *admins du groupe* peuvent utiliser `.kickall`.',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        // 3. Récupérer la liste des membres du groupe
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];

        // 4. Récupérer l'ID du bot
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // 5. Filtrer : garder seulement les NON-admins (et exclure le bot lui-même)
        const toKick = participants.filter(p => {
            const isParticipantAdmin = p.admin === 'admin' || p.admin === 'superadmin';
            const isBot = p.id === botId || p.id?.split('@')[0] === botId.split('@')[0];
            return !isParticipantAdmin && !isBot;
        });

        if (toKick.length === 0) {
            await sock.sendMessage(chatId, {
                text: '✅ Il n\'y a aucun membre non-admin à expulser.',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        // 6. Message de démarrage
        await sock.sendMessage(chatId, {
            text: `╭───❏ ANOS_VOLDIGOAD_MINI_MD\n│ 🔄 \`Kickall lancé\`\n│ 👥 Membres à expulser : *${toKick.length}*\n│ ⏳ Patiente...\n╰───❏`,
            ...channelInfo
        }, { quoted: message });

        // 7. Expulser tous les membres non-admins
        let kicked = 0;
        let failed = 0;

        for (const participant of toKick) {
            try {
                await sock.groupParticipantsUpdate(chatId, [participant.id], 'remove');
                kicked++;
                // Petite pause pour éviter le spam
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                console.error('Error kicking participant:', err);
                failed++;
            }
        }

        // 8. Message de fin
        await sock.sendMessage(chatId, {
            text: `╭───❏ ANOS_VOLDIGOAD_MINI_MD\n│ ✅ \`purge terminé\`\n│ ✔️ Expulsés : *${kicked}*\n│ ❌ Échecs : *${failed}*\n│ 👑 Admins gardés\n╰───❏\n›  • \`𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 💻 𝗦𝗠𝗗\``,
            ...channelInfo
        }, { quoted: message });

    } catch (error) {
        console.error('Error in kickall command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Une erreur est survenue lors du kickall.',
            ...channelInfo
        }, { quoted: message });
    }
}

module.exports = kickallCommand;
