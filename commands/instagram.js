const axios = require('axios');

async function instagramCommand(sock, chatId, message) {
    try {
        const body = message.message?.conversation
            || message.message?.extendedTextMessage?.text
            || '';

        const args = body.trim().split(/\s+/);
        const url = args[1];

        if (!url || !url.includes('instagram.com')) {
            await sock.sendMessage(chatId, {
                text: '❌ Veuillez fournir un lien Instagram valide.\n✅ Exemple : *.ig https://www.instagram.com/p/XXXX/*'
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            react: { text: '⬇️', key: message.key }
        }).catch(() => {});

        // Try tele-social API
        const apiUrl = `https://tele-social.vercel.app/down?url=${encodeURIComponent(url)}`;
        const res = await axios.get(apiUrl, { timeout: 15000 });
        const data = res.data;

        const isOk = data?.success === true || data?.statut === 'vrai' || data?.status === true || data?.vrai === true;
        const payload = data?.données || data?.data || data?.result || data?.meta;

        if (!isOk || !payload) {
            await sock.sendMessage(chatId, {
                text: '❌ Impossible de télécharger ce contenu Instagram.\n• Vérifie que le compte est public.\n• Réessaie avec un autre lien.'
            }, { quoted: message });
            return;
        }

        // Get media links
        const medias = payload?.medias?.medias || payload?.data?.medias || payload?.medias || [];
        const mediaArr = Array.isArray(medias) ? medias : [];

        if (mediaArr.length === 0) {
            await sock.sendMessage(chatId, {
                text: '❌ Aucun média trouvé dans ce post.'
            }, { quoted: message });
            return;
        }

        const caption = `📸 *Instagram Downloader*\n👤 *${payload?.author?.username || payload?.auteur?.username || 'N/A'}*\n❤️ Likes : ${payload?.likes ?? 'N/A'}\n💬 Commentaires : ${payload?.comments ?? 'N/A'}\n\n✨ 𝗦𝗨𝗞𝗨𝗡𝗔 𝗫𝗗`;

        // Send up to 5 media
        const limit = Math.min(mediaArr.length, 5);
        for (let i = 0; i < limit; i++) {
            const item = mediaArr[i];
            const mediaUrl = item?.org || item?.url || item?.hd || item?.wm;
            if (!mediaUrl) continue;

            const isVideo = item?.type === 'video' || mediaUrl.includes('.mp4');

            if (isVideo) {
                await sock.sendMessage(chatId, {
                    video: { url: mediaUrl },
                    mimetype: 'video/mp4',
                    caption: i === 0 ? caption : ''
                }, { quoted: i === 0 ? message : undefined }).catch(() => {});
            } else {
                await sock.sendMessage(chatId, {
                    image: { url: mediaUrl },
                    caption: i === 0 ? caption : ''
                }, { quoted: i === 0 ? message : undefined }).catch(() => {});
            }
        }

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (error) {
        console.error('Error in instagram command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Erreur lors du téléchargement Instagram. Réessaie plus tard.'
        }, { quoted: message }).catch(() => {});
    }
}

module.exports = instagramCommand;
