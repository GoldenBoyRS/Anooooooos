const axios = require('axios');

async function lyricsCommand(sock, chatId, query, message) {
    try {
        if (!query || query.trim() === '') {
            await sock.sendMessage(chatId, {
                text: '❌ Veuillez préciser une chanson.\n✅ Exemple : *.lyrics Bohemian Rhapsody*'
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            react: { text: '🔍', key: message.key }
        }).catch(() => {});

        // Search via lyrics.ovh
        const searchRes = await axios.get(
            `https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`,
            { timeout: 10000 }
        );

        const results = searchRes.data?.data;
        if (!results || results.length === 0) {
            await sock.sendMessage(chatId, {
                text: `❌ Aucune chanson trouvée pour : *${query}*`
            }, { quoted: message });
            return;
        }

        const top = results[0];
        const artist = top.artist?.name || 'Inconnu';
        const title = top.title || query;

        // Get lyrics
        const lyricsRes = await axios.get(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
            { timeout: 10000 }
        );

        const lyrics = lyricsRes.data?.lyrics;
        if (!lyrics) {
            await sock.sendMessage(chatId, {
                text: `❌ Paroles introuvables pour *${title}* de *${artist}*.`
            }, { quoted: message });
            return;
        }

        // Truncate if too long
        const maxLen = 3500;
        const truncated = lyrics.length > maxLen
            ? lyrics.substring(0, maxLen) + '\n\n... *(paroles tronquées)*'
            : lyrics;

        const text = `🎵 *${title}*\n👤 *${artist}*\n\n${truncated}`;

        await sock.sendMessage(chatId, { text }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (error) {
        console.error('Error in lyrics command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Impossible de récupérer les paroles. Réessaie plus tard.'
        }, { quoted: message }).catch(() => {});
    }
}

module.exports = { lyricsCommand };
