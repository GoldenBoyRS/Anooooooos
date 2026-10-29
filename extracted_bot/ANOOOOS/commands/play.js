const yts = require('yt-search');
const axios = require('axios');

const newsletterContext = {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363422530463919@newsletter',
        newsletterName: '𝐀𝐍𝐎𝐒_𝐕𝐎𝐋𝐃𝐈𝐆𝐎𝐀𝐃_𝐌𝐈𝐍𝐈_𝐌𝐃',
        serverMessageId: -1
    }
};

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: "🎵 *TÉLÉCHARGEMENT DE MUSIQUE* 🎵\n\nVeuillez fournir le nom de la chanson.\n\n📌 *Exemple:* `.play Imagine - John Lennon`",
                contextInfo: newsletterContext
            });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: `❌ *Aucun résultat trouvé*`, contextInfo: newsletterContext });
        }

        await sock.sendMessage(chatId, { text: "⏳ *Téléchargement en cours...*\n\nPatiente quelques instants 🎵", contextInfo: newsletterContext });

        const video = videos[0];
        const urlYt = video.url;
        const videoTitle = video.title;

        // NOUVELLE API POUR LE PLAY
        const response = await axios.get(`https://izumiiiiiiii.ddns.net/downloader/ytmp3?url=${urlYt}`, { timeout: 30000 });
        const data = response.data;

        if (!data || !data.success || !data.result || !data.result.download) {
            return await sock.sendMessage(chatId, { text: "❌ *Échec de l'API*\n\nRéessaie plus tard.", contextInfo: newsletterContext });
        }

        const audioUrl = data.result.download;
        const title = data.result.title || videoTitle;

        const audioCaption = `🎵 *${title}* 🎵\n\n✅ *Téléchargement réussi !*\n\n📥 *Téléchargé par ${global.botname || 'ANOS_VOLDI'}*`;
        
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`,
            caption: audioCaption,
            contextInfo: newsletterContext
        }, { quoted: message });
        
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (error) {
        console.error('Erreur dans la commande play:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *ÉCHEC DU TÉLÉCHARGEMENT*\n\nUne erreur inattendue est survenue. Réessaie plus tard.',
            contextInfo: newsletterContext
        });
    }
}

module.exports = playCommand;