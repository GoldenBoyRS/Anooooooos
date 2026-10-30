const isAdmin = require('../lib/isAdmin');
const { channelInfo } = require('../lib/messageConfig');

async function kickCommand(sock, chatId, senderId, mentionedJids, message) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette commande ne peut être utilisée que dans un groupe.',
                ...channelInfo
            }, { quoted: message });
            return;
        }

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
                text: '❌ Seuls les *admins du groupe* peuvent utiliser `.kick`.',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        // Get target from mentions or quoted message
        let targets = [];
        if (mentionedJids && mentionedJids.length > 0) {
            targets = mentionedJids;
        } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            targets = [message.message.extendedTextMessage.contextInfo.participant];
        }

        if (targets.length === 0) {
            await sock.sendMessage(chatId, {
                text: `╭─────❏ ANOS_VOLDIGOAD_MINI_MD\n│ 🚫 \`Erreur\` : utilisateur non détecté\n│ ✅ Utilise :\n│ • \`.kick @user\`\n│ • Ou réponds au message et tape \`.kick\`\n╰─────❏`,
                ...channelInfo
            }, { quoted: message });
            return;
        }

        // Kick each target
        for (const target of targets) {
            try {
                await sock.groupParticipantsUpdate(chatId, [target], 'remove');
                await sock.sendMessage(chatId, {
                    text: `✅ @${target.split('@')[0]} a été expulsé du groupe.`,
                    mentions: [target],
                    ...channelInfo
                });
            } catch (err) {
                console.error('Error kicking user:', err);
                await sock.sendMessage(chatId, {
                    text: `❌ Impossible d'expulser @${target.split('@')[0]}.`,
                    mentions: [target],
                    ...channelInfo
                });
            }
        }

    } catch (error) {
        console.error('Error in kick command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Une erreur est survenue lors de l\'expulsion.',
            ...channelInfo
        }, { quoted: message });
    }
}

module.exports = kickCommand;
