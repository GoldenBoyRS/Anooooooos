const axios = require('axios');
const { channelInfo } = require('../lib/messageConfig');

async function wastedCommand(sock, chatId, message) {
    let userToWaste;

    // Check for mentioned users
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToWaste = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Check for replied message
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToWaste = message.message.extendedTextMessage.contextInfo.participant;
    }

    if (!userToWaste) {
        await sock.sendMessage(chatId, {
            text:
`╭───❏ 𝐀𝐍𝐎𝐒_𝐕𝐎𝐋𝐃𝐈𝐆𝐎𝐀𝐃_𝐌𝐈𝐍𝐈_𝐌𝐃
│ ⚠️ \`Erreur\` : utilisateur non détecté
│ ✅ Utilise :
│ • .wasted @user
│ • Ou réponds à un message + .wasted
╰────❏
›  • \`𝙶𝚘𝚕𝚍𝚎𝚗𝙱𝚘𝚢 𝙳𝚎𝚟\``,
            ...channelInfo
        }, { quoted: message });
        return;
    }

    try {
        // Get user's profile picture
        let profilePic;
        try {
            profilePic = await sock.profilePictureUrl(userToWaste, 'image');
        } catch {
            profilePic = 'https://i.imgur.com/2wzGhpF.jpeg'; // Default image if no profile pic
        }

        // Get the wasted effect image
        const wastedResponse = await axios.get(
            `https://some-random-api.com/canvas/overlay/wasted?avatar=${encodeURIComponent(profilePic)}`,
            { responseType: 'arraybuffer' }
        );

        // Send the wasted image
        await sock.sendMessage(chatId, {
            image: Buffer.from(wastedResponse.data),
            caption:
`╭───❏ 𝐀𝐍𝐎𝐒_𝐕𝐎𝐋𝐃𝐈𝐆𝐎𝐀𝐃_𝐌𝐈𝐍𝐈_𝐌𝐃
│ ⚰️ \`WASTED\` 💀
│ 👤 Cible : @${userToWaste.split('@')[0]}
│ 😈 Que la terre te soit légère !
╰────❏
›  • \`𝙶𝚘𝚕𝚍𝚎𝚗𝙱𝚘𝚢 𝙳𝚎𝚟\``,
            mentions: [userToWaste],
            ...channelInfo
        });

    } catch (error) {
        console.error('Error in wasted command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Impossible de créer l’image pour le moment. Réessaie plus tard.',
            ...channelInfo
        }, { quoted: message });
    }
}

module.exports = wastedCommand;