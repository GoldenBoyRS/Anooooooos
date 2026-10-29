const axios = require('axios');
const yts = require('yt-search');

const newsletterContext = {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363422530463919@newsletter',
        newsletterName: '𝐀𝐍𝐎𝐒_𝐕𝐎𝐋𝐃𝐈𝐆𝐎𝐀𝐃_𝐌𝐈𝐍𝐈_𝐌𝐃',
        serverMessageId: -1
    }
};

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

// NOUVELLE API 1
async function getIzumiVideoByUrl(youtubeUrl) {
    const apiUrl = `https://izumiiiiiiii.ddns.net/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.result?.download) {
        return { download: res.data.result.download, title: res.data.result.title };
    }
    throw new Error('Izumi ytdown returned no download');
}

// NOUVELLE API 2
async function getVredenVideoByUrl(youtubeUrl) {
    const apiUrl = `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.download?.url) {
        return { download: res.data.result.download.url, title: res.data.result.metadata.title };
    }
    throw new Error('Vreden ytmp4 returned no mp4');
}

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            await sock.sendMessage(chatId, { 
                text: '🎬 *TÉLÉCHARGEMENT DE VIDÉO* 🎬\n\n📌 *Utilisation:* .video <nom ou lien YouTube>\n\n✨ *Exemples:*\n• `.video Imagine - John Lennon`\n• `.video https://youtu.be/...`',
                contextInfo: newsletterContext
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: '🎬', key: message.key } });
        await sock.sendMessage(chatId, { text: "🔍 *Recherche en cours...*\n\nVeuillez patienter, je cherche la vidéo...", contextInfo: newsletterContext });

        let videoUrl = '';
        let videoTitle = '';
        let videoThumbnail = '';
        let videoDuration = '';
        let videoViews = '';
        
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
            videoTitle = searchQuery;
        } else {
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { text: '❌ *Aucun résultat trouvé*', contextInfo: newsletterContext }, { quoted: message });
                return;
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
            videoDuration = videos[0].duration?.timestamp || 'Durée inconnue';
            videoViews = videos[0].views ? new Intl.NumberFormat().format(videos[0].views) : 'Inconnu';
        }

        try {
            const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
            const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : undefined);
            const captionTitle = videoTitle || searchQuery;
            
            if (thumb) {
                await sock.sendMessage(chatId, {
                    image: { url: thumb },
                    caption: `🎬 *${captionTitle}* 🎬\n━━━━━━━━━━━━━━━━━━━━━━━\n\n⏱️ *Durée:* ${videoDuration}\n👁️ *Vues:* ${videoViews}\n━━━━━━━━━━━━━━━━━━━━━━━\n\n⏳ *Téléchargement en cours...*`,
                    contextInfo: newsletterContext
                }, { quoted: message });
            }
        } catch (e) { console.error('[VIDEO] Erreur miniature:', e?.message || e); }

        let videoData;
        let downloadSuccess = false;
        
        // On utilise les nouvelles APIs ici
        const apiMethods = [
            { name: 'Izumi', method: () => getIzumiVideoByUrl(videoUrl) },
            { name: 'Vreden', method: () => getVredenVideoByUrl(videoUrl) }
        ];
        
        for (const apiMethod of apiMethods) {
            try {
                videoData = await apiMethod.method();
                if (!videoData.download) continue;
                downloadSuccess = true;
                break;
            } catch (apiErr) {
                console.log(`${apiMethod.name} API a échoué:`, apiErr.message);
                continue;
            }
        }
        
        if (!downloadSuccess || !videoData) {
            throw new Error('Toutes les sources ont échoué');
        }

        await sock.sendMessage(chatId, { text: "⬇️ *Préparation de la vidéo...*\n\nPatientez quelques instants...", contextInfo: newsletterContext });

        const videoTitleClean = (videoData.title || videoTitle || 'video').replace(/[^\w\s-]/g, '');

        await sock.sendMessage(chatId, {
            video: { url: videoData.download },
            mimetype: 'video/mp4',
            fileName: `${videoTitleClean}.mp4`,
            caption: `🎬 *${videoData.title || videoTitle || 'Vidéo'}* 🎬\n━━━━━━━━━━━━━━━━━━━━━━━\n\n📥 *Téléchargé par ${global.botname || 'ANOS_VOLDIGOAD'}*\n━━━━━━━━━━━━━━━━━━━━━━━\n✨ Profitez de votre vidéo ! ✨`,
            contextInfo: newsletterContext
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        
    } catch (error) {
        console.error('[VIDEO] Erreur:', error?.message || error);
        await sock.sendMessage(chatId, { text: '❌ *ÉCHEC DU TÉLÉCHARGEMENT* ❌\n\nUne erreur est survenue. La vidéo est peut-être indisponible ou bloquée par YouTube.', contextInfo: newsletterContext }, { quoted: message });
    }
}

module.exports = videoCommand;