/**
 * main.js - WhatsApp bot message router (Baileys based).
 */
const fs = require('fs');
const path = require('path');
const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;
setInterval(() => {
  fs.readdir(customTemp, (readdirError, fileNames) => {
    if (readdirError) return;
    for (const fileName of fileNames) {
      const filePath = path.join(customTemp, fileName);
      fs.stat(filePath, (statError, stats) => {
        if (!statError && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) fs.unlink(filePath, () => {});
      });
    }
  });
  console.log('🧹 Temp folder auto-cleaned');
}, 3 * 60 * 60 * 1000);

const settings = require('./settings');

// --- DEBUT CONFIG VV2 ---
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const vvCache = new Map();
function getVv2Emoji() {
    try {
        const data = fs.readFileSync('./data/vv2.json', 'utf8');
        return JSON.parse(data).emoji || '🧭';
    } catch (e) { return '🧭'; }
}
// --- FIN CONFIG VV2 ---

function readPrefixFromSettingsFile() {
  try {
    const settingsFilePath = path.join(__dirname, 'settings.js');
    if (!fs.existsSync(settingsFilePath)) return '.';
    const settingsContent = fs.readFileSync(settingsFilePath, 'utf8');
    const exportsPrefixMatch = settingsContent.match(/module\.exports\.prefix\s*=\s*([^\n\r;]+)[;\n\r]/);
    if (exportsPrefixMatch && exportsPrefixMatch[1]) {
      const rawPrefixValue = String(exportsPrefixMatch[1]).trim();
      const quotedValueMatch = rawPrefixValue.match(/^(['"`])([\s\S]*?)\1$/);
      if (quotedValueMatch && quotedValueMatch[2]) return String(quotedValueMatch[2]).trim();
      const quotedValues = [...rawPrefixValue.matchAll(/(['"`])([\s\S]*?)\1/g)].map(quotedMatch => quotedMatch[2]);
      if (quotedValues.length) return String(quotedValues[quotedValues.length - 1]).trim();
    }
    const inlinePrefixMatch = settingsContent.match(/\bprefix\s*:\s*(['"`])([\s\S]*?)\1/);
    if (inlinePrefixMatch && inlinePrefixMatch[2]) return String(inlinePrefixMatch[2]).trim();
    return '.';
  } catch (error) { return '.'; }
}
const prefix = '.';
require('./config.js');

// --- IMPORTS DES COMMANDES ---
const {isBanned} = require('./lib/isBanned');
const yts = require('yt-search');
const {fetchBuffer} = require('./lib/myfunc');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const {isSudo} = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const {autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand} = require('./commands/autotyping');
const {autoreadCommand, isAutoreadEnabled, handleAutoread} = require('./commands/autoread');
const tagAllCommand = require('./commands/tagall');
const apkCommand = require('./commands/apk');
const apkdlCommand = require('./commands/apkdl');
const antiMentionCommand = require('./commands/antimention');
const setPrefixCommand = require('./commands/setprefix');
const helpCommand = require('./commands/help');
const banCommand = require('./commands/ban');
const {promoteCommand} = require('./commands/promote');
const {demoteCommand} = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const isAdmin = require('./lib/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
const {tictactoeCommand, handleTicTacToeMove} = require('./commands/tictactoe');
const {incrementMessageCount, topMembers} = require('./commands/topmembers');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const {handleAntilinkCommand, handleLinkDetection} = require('./commands/antilink');
const {handleAntitagCommand, handleTagDetection} = require('./commands/antitag');
const {Antilink} = require('./lib/antilink');
const {handleMentionDetection, mentionToggleCommand, setMentionCommand} = require('./commands/mention');
const memeCommand = require('./commands/meme');
const tagCommand = require('./commands/tag');
const tagNotAdminCommand = require('./commands/tagnotadmin');
const hideTagCommand = require('./commands/hidetag');
const jokeCommand = require('./commands/joke');
const quoteCommand = require('./commands/quote');
const factCommand = require('./commands/fact');
const weatherCommand = require('./commands/weather');
const newsCommand = require('./commands/news');
const kickCommand = require('./commands/kick');
const kickallCommand = require('./commands/kickall');
const simageCommand = require('./commands/simage');
const attpCommand = require('./commands/attp');
const {startHangman, guessLetter} = require('./commands/hangman');
const {startTrivia, answerTrivia} = require('./commands/trivia');
const {complimentCommand} = require('./commands/compliment');
const {insultCommand} = require('./commands/insult');
const {eightBallCommand} = require('./commands/eightball');
const {lyricsCommand} = require('./commands/lyrics');
const {dareCommand} = require('./commands/dare');
const {truthCommand} = require('./commands/truth');
const {clearCommand} = require('./commands/clear');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const blurCommand = require('./commands/img-blur');
const {welcomeCommand, handleJoinEvent} = require('./commands/welcome');
const {goodbyeCommand, handleLeaveEvent} = require('./commands/goodbye');
const githubCommand = require('./commands/github');
const {handleAntiBadwordCommand, handleBadwordDetection} = require('./lib/antibadword');
const antibadwordCommand = require('./commands/antibadword');
const {handleChatbotCommand, handleChatbotResponse} = require('./commands/chatbot');
const takeCommand = require('./commands/take');
const {flirtCommand} = require('./commands/flirt');
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const shipCommand = require('./commands/ship');
const groupInfoCommand = require('./commands/groupinfo');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
const emojimixCommand = require('./commands/emojimix');
const {handlePromotionEvent} = require('./commands/promote');
const {handleDemotionEvent} = require('./commands/demote');
const viewOnceCommand = require('./commands/viewonce');
const clearSessionCommand = require('./commands/clearsession');
const {autoStatusCommand, handleStatusUpdate} = require('./commands/autostatus');
const {simpCommand} = require('./commands/simp');
const {stupidCommand} = require('./commands/stupid');
const stickerTelegramCommand = require('./commands/stickertelegram');
const textmakerCommand = require('./commands/textmaker');
const {handleAntideleteCommand, handleMessageRevocation, storeMessage} = require('./commands/antidelete');
const clearTmpCommand = require('./commands/cleartmp');
const setProfilePicture = require('./commands/setpp');
const {setGroupDescription, setGroupName, setGroupPhoto} = require('./commands/groupmanage');
const instagramCommand = require('./commands/instagram');
const facebookCommand = require('./commands/facebook');
const spotifyCommand = require('./commands/spotify');
const playCommand = require('./commands/play');
const tiktokCommand = require('./commands/tiktok');

const tiktokCache = new Map();
function _ttIsUrl(value) { return typeof value === 'string' && /^https?:\/\/\S+/i.test(value.trim()); }
function _ttCleanUrl(rawUrl) { if (!_ttIsUrl(rawUrl)) return null; return rawUrl.trim().replace(/\s+/g, ''); }
function _ttFormat(value) { if (value === undefined || value === null) return 'N/A'; return String(value); }
async function _ttGetJson(url) {
  return axios.get(url, { timeout: 25000, headers: { accept: 'application/json, text/plain, */*', 'user-agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Safari/537.36' }, validateStatus: () => true });
}
async function _ttFetchTeleSocial(videoUrl) {
  const apiUrl = 'https://tele-social.vercel.app/down?url=' + encodeURIComponent(videoUrl);
  const response = await _ttGetJson(apiUrl);
  if (response.status < 200 || response.status >= 300) return { ok: false, reason: 'HTTP ' + response.status };
  const body = response.data || {};
  const isSuccess = body?.statut === true || body?.statut === 'vrai' || body?.status === true || body?.success === true;
  const payload = body?.['données'] || body?.donnees || body?.data || body?.result;
  if (!isSuccess || !payload) return { ok: false, reason: body?.message || body?.error || 'données introuvables / statut false' };
  const mediaList = payload?.['méta']?.['médias'] || payload?.meta?.medias || payload?.meta?.['médias'] || payload?.['méta']?.medias || [];
  const media = Array.isArray(mediaList) ? mediaList[0] || {} : mediaList || {};
  const links = { org: _ttCleanUrl(media?.org), wm: _ttCleanUrl(media?.wm), hd: _ttCleanUrl(media?.hd) };
  if (!links.org && !links.wm && !links.hd) return { ok: false, reason: 'aucun lien vidéo (org/wm/hd) dans la réponse' };
  const info = { title: payload?.title || 'Vidéo TikTok', authorNick: payload?.auteur?.surnom || payload?.auteur?.nickname || 'N/A', authorUser: payload?.auteur?.['nom d\'utilisateur'] || payload?.auteur?.username || 'N/A', likes: payload?.like, comments: payload?.commentaire, shares: payload?.part, views: payload?.repro, published: payload?.['publié'], sizes: { org: media?.size_org, wm: media?.size_wm, hd: media?.size_hd } };
  return { ok: true, provider: 'tele-social', info, links };
}
async function _ttFetchTikwmFallback(videoUrl) {
  const apiUrl = 'https://www.tikwm.com/api/?url=' + encodeURIComponent(videoUrl) + '&hd=1';
  const response = await _ttGetJson(apiUrl);
  if (response.status < 200 || response.status >= 300) return { ok: false, reason: 'TikWM HTTP ' + response.status };
  const body = response.data || {};
  if (body.code !== 0 || !body.data) return { ok: false, reason: body?.msg || 'TikWM: réponse invalide' };
  const videoData = body.data;
  const links = { org: _ttCleanUrl(videoData?.play), wm: _ttCleanUrl(videoData?.wmplay), hd: _ttCleanUrl(videoData?.hdplay) };
  if (!links.org && !links.wm && !links.hd) return { ok: false, reason: 'TikWM: aucun lien vidéo' };
  const info = { title: videoData?.title || 'Vidéo TikTok', authorNick: videoData?.author?.nickname || 'N/A', authorUser: videoData?.author?.unique_id ? '@' + videoData.author.unique_id : 'N/A', likes: videoData?.digg_count, comments: videoData?.comment_count, shares: videoData?.share_count, views: videoData?.play_count, published: videoData?.create_time ? new Date(videoData.create_time * 1000).toLocaleDateString('fr-FR') : 'N/A', sizes: { org: null, wm: null, hd: null } };
  return { ok: true, provider: 'tikwm', info, links };
}
function _ttBuildListMessage(info, links) {
  const authorLine = (info.authorNick || 'N/A') + ' (' + (info.authorUser || 'N/A') + ')';
  const orgLine = links.org ? '1️⃣ 📼 Vidéo ORG' + (info.sizes?.org ? ' (' + info.sizes.org + ')' : '') : '1️⃣ 📼 Vidéo ORG (indispo)';
  const wmLine = links.wm ? '2️⃣ 💧 Vidéo WM' + (info.sizes?.wm ? ' (' + info.sizes.wm + ')' : '') : '2️⃣ 💧 Vidéo WM (indispo)';
  const hdLine = links.hd ? '3️⃣ ⚡ Vidéo HD' + (info.sizes?.hd ? ' (' + info.sizes.hd + ')' : '') : '3️⃣ ⚡ Vidéo HD (indispo)';
  return '╭━━━〔 🎥 TIKTOK 〕━━━╮\n┃ 👤 Auteur : `' + authorLine + '`\n┃ ❤️ Likes : `' + _ttFormat(info.likes) + '`\n┃ 💬 Com : `' + _ttFormat(info.comments) + '`\n┃ 🔁 Part : `' + _ttFormat(info.shares) + '`\n┃ 👁️ Vues : `' + _ttFormat(info.views) + '`\n┃ 📅 Publié : `' + _ttFormat(info.published) + '`\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n📝 *Titre :*\n' + (info.title || '—') + '\n\n📎 *Choisis une qualité :*\n' + orgLine + '\n' + wmLine + '\n' + hdLine + '\n\n➡️ Réponds avec : *.tiktok 1* | *.tiktok 2* | *.tiktok 3*\n\n𝐀𝐍𝐎𝐒_𝐕𝐎𝐋𝐃𝐈𝐆𝐎𝐀𝐃_𝐌𝐈𝐍𝐈_𝐌𝐃';
}
async function handleTikTokCommand(sock, chatId, message) {
  const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
  const args = messageText.split(' ').slice(1).filter(Boolean);
  const firstArg = (args[0] || '').trim();
  try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}
  if (/^[123]$/.test(firstArg)) {
    const cachedChoice = tiktokCache.get(chatId);
    if (!cachedChoice || Date.now() > cachedChoice.expiresAt) {
      tiktokCache.delete(chatId);
      try { await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }); } catch {}
      return sock.sendMessage(chatId, { text: '❌ Aucun choix en attente.\n✅ Fais d’abord : *.tiktok <lien>*', ...channelInfo }, { quoted: message });
    }
    const choice = Number(firstArg);
    const videoLink = choice === 1 ? cachedChoice.links.org : choice === 2 ? cachedChoice.links.wm : cachedChoice.links.hd;
    if (!videoLink) {
      try { await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }); } catch {}
      return sock.sendMessage(chatId, { text: '❌ Cette qualité est indisponible pour ce lien.\n✅ Essaie une autre option (1/2/3).', ...channelInfo }, { quoted: message });
    }
    const qualityLabel = choice === 1 ? 'ORG' : choice === 2 ? 'WM' : 'HD';
    const caption = ('✅ *Téléchargement TikTok*\n🎞️ Qualité : *' + qualityLabel + '*\n📝 ' + (cachedChoice.info?.title ? cachedChoice.info.title : '') + '\n 𝐀𝐍𝐎𝐒_𝐕𝐎𝐋𝐃𝐈𝐆𝐎𝐀𝐃_𝐌𝐈𝐍𝐈_𝐌𝐃').trim();
    try {
      await sock.sendMessage(chatId, { video: { url: videoLink }, mimetype: 'video/mp4', caption, ...channelInfo }, { quoted: message });
      try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}
      return;
    } catch (error) {
      try { await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }); } catch {}
      return sock.sendMessage(chatId, { text: '❌ Impossible d’envoyer la vidéo (lien expiré ou trop lourd).\n✅ Réessaie : *.tiktok <lien>*', ...channelInfo }, { quoted: message });
    }
  }
  const tiktokUrl = args.join(' ').trim();
  if (!tiktokUrl || !_ttIsUrl(tiktokUrl)) {
    try { await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }); } catch {}
    return sock.sendMessage(chatId, { text: '❌ Donne un lien TikTok.\n✅ Exemple : *.tiktok https://vm.tiktok.com/XXXX*', ...channelInfo }, { quoted: message });
  }
  let result = await _ttFetchTeleSocial(tiktokUrl);
  if (!result.ok) result = await _ttFetchTikwmFallback(tiktokUrl);
  if (!result.ok) {
    try { await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }); } catch {}
    return sock.sendMessage(chatId, { text: '❌ API erreur: ' + (result.reason || 'données introuvables / statut false') + '.\nRéessaie.', ...channelInfo }, { quoted: message });
  }
  tiktokCache.set(chatId, { links: result.links, info: result.info, expiresAt: Date.now() + 10 * 60 * 1000 });
  const listMessage = _ttBuildListMessage(result.info, result.links);
  await sock.sendMessage(chatId, { text: listMessage, ...channelInfo }, { quoted: message });
  try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}
}

const songCommand = require('./commands/song');
const aiCommand = require('./commands/ai');
const urlCommand = require('./commands/url');
const {handleTranslateCommand} = require('./commands/translate');
const {handleSsCommand} = require('./commands/ss');
const {addCommandReaction, handleAreactCommand} = require('./lib/reactions');
const {goodnightCommand} = require('./commands/goodnight');
const {shayariCommand} = require('./commands/shayari');
const {rosedayCommand} = require('./commands/roseday');
const imagineCommand = require('./commands/imagine');
const videoCommand = require('./commands/video');
const sudoCommand = require('./commands/sudo');
const {miscCommand, handleHeart} = require('./commands/misc');
const {animeCommand} = require('./commands/anime');
const {piesCommand, piesAlias} = require('./commands/pies');
const stickercropCommand = require('./commands/stickercrop');
const updateCommand = require('./commands/update');
const removebgCommand = require('./commands/removebg');
const {reminiCommand} = require('./commands/remini');
const {igsCommand} = require('./commands/igs');
const { anticallCommand, readState: readAnticallState } = require('./commands/anticall');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
const soraCommand = require('./commands/sora');
const pinterestCommand = require('./commands/pinterest');

global.packname = settings.packname;
global.author = settings.author;
global.channelLink = 'https://whatsapp.com/channel/0029VbC8KUk2kNFp2Fb0bF3J';
global.ytch = 'GoldenBoy Dev';

const channelInfo = {
  contextInfo: {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: '120363422530463919@newsletter',
      newsletterName: '𝐀𝐍𝐎𝐒_𝐕𝐎𝐋𝐃𝐈𝐆𝐎𝐀𝐃_𝐌𝐈𝐍𝐈_𝐌𝐃',
      serverMessageId: -1
    }
  }
};

function parseDurationToMs(rawDuration) {
  if (!rawDuration) return undefined;
  const normalized = String(rawDuration).trim().toLowerCase(), durationMatch = normalized.match(/^(\d+)(s|sec|secs|m|min|mins)?$/i);
  if (!durationMatch) return null;
  const amount = parseInt(durationMatch[1], 10), unit = (durationMatch[2] || 'm').toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (unit === 's' || unit === 'sec' || unit === 'secs') return amount * 1000;
  return amount * 60 * 1000;
}

async function handleJidCommand(sock, chatId, message) {
  const jid = message.key.remoteJid;
  if (!jid.endsWith('@g.us')) return await sock.sendMessage(chatId, { text: '❌ This command can only be used in a group.' });
  await sock.sendMessage(chatId, { text: '✅ Group JID: ' + jid }, { quoted: message });
}

async function handleMessages(sock, chatUpdate, printLog) {
  let chatId;
  try {
    const { messages, type: updateType } = chatUpdate;
    if (updateType !== 'notify') return;
    const message = messages[0];
    if (!message?.message) return;

    // ==========================================
    // 1. CAPTURE DES VUES UNIQUES (MISE EN CACHE)
    // ==========================================
    const msgType = Object.keys(message.message)[0];
    if (msgType === 'viewOnceMessageV2' || msgType === 'viewOnceMessage' || msgType === 'viewOnceMessageV2Extension') {
        console.log(`--- 📸 VUE UNIQUE CAPTURÉE (ID: ${message.key.id}) ---`);
        if (vvCache.size >= 100) {
            const first = vvCache.keys().next().value;
            if (first) vvCache.delete(first);
        }
        vvCache.set(message.key.id, message);
        // On garde en cache pendant 1 heure
        setTimeout(() => vvCache.delete(message.key.id), 60 * 60 * 1000);
    }

    // ==========================================
    // 2. INTERCEPTION DE LA RÉACTION (DÉVERROUILLAGE)
    // ==========================================
    if (msgType === 'reactionMessage') {
        const reaction = message.message.reactionMessage;
        const targetKey = reaction.key;
        const emojiEnvoye = reaction.text || '';
        const emojiConfigure = getVv2Emoji();

        const cleanEnvoye = emojiEnvoye.normalize('NFC').trim();
        const cleanConfigure = emojiConfigure.normalize('NFC').trim();

        if (cleanEnvoye === cleanConfigure || cleanEnvoye.includes(cleanConfigure) || cleanConfigure.includes(cleanEnvoye)) {
            
            // ✅ CORRECTION ICI : On enlève le "-1" à la fin de l'ID
            const targetId = targetKey.id.replace(/-1$/, ''); 
            const originalMsg = vvCache.get(targetId);
            
            if (originalMsg) {
                console.log(`✅ Déverrouillage de la vue unique ${targetId}...`);
                try {
                    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    
                    const innerType = Object.keys(originalMsg.message)[0];
                    let innerMsg = originalMsg.message[innerType].message;
                    
                    if (innerMsg.documentWithCaptionMessage) {
                        innerMsg = innerMsg.documentWithCaptionMessage.message.viewOnceMessageV2.message;
                    }

                    const mediaType = Object.keys(innerMsg)[0];
                    const mediaMsg = innerMsg[mediaType];

                    if (['imageMessage', 'videoMessage', 'audioMessage'].includes(mediaType)) {
                        const stream = await downloadContentFromMessage(mediaMsg, mediaType.replace('Message', ''));
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }

                        let caption = `👁️ *MESSAGE VUE UNIQUE DÉVERROUILLÉ*\n\n📌 De : @${originalMsg.key.participant || originalMsg.key.remoteJid}\n💬 Chat : ${originalMsg.key.remoteJid}\n\n⚠️ _Déclenché par l'emoji ${emojiConfigure}_`;
                        let content = {};
                        
                        if (mediaType === 'imageMessage') content = { image: buffer, caption: caption, mentions: [originalMsg.key.participant || originalMsg.key.remoteJid] };
                        else if (mediaType === 'videoMessage') content = { video: buffer, caption: caption, mentions: [originalMsg.key.participant || originalMsg.key.remoteJid] };
                        else if (mediaType === 'audioMessage') content = { audio: buffer, mimetype: 'audio/mp4', ptt: false };

                        await sock.sendMessage(botJid, content);
                        console.log('✅ Média VV2 envoyé en privé !');
                        vvCache.delete(targetId);
                    }
                } catch (err) { console.error("❌ Erreur téléchargement VV2:", err); }
            } else {
                console.log(`⚠️ Le message ${targetId} n'est pas dans le cache.`);
            }
        }
        return; // On arrête le traitement ici
    }
    // ==========================================

    await handleAutoread(sock, message);
    if (message.message) storeMessage(sock, message);
    
    if (message.message?.protocolMessage?.type === 0) {
      await handleMessageRevocation(sock, message);
      return;
    }
    
    chatId = message.key.remoteJid;
    const senderId = message.key.participant || message.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    
    try {
      const {getAntimention} = require('./lib/index');
      const antiMentionEnabled = !!await getAntimention(chatId, 'on');
      if (antiMentionEnabled && isGroup) {
        const contextInfo = message.message?.extendedTextMessage?.contextInfo || message.message?.imageMessage?.contextInfo || message.message?.videoMessage?.contextInfo || message.message?.documentMessage?.contextInfo || message.message?.conversation?.contextInfo || null;
        const mentionedJids = contextInfo?.mentionedJid || [];
        const mentionThreshold = Number(settings.antiMention?.threshold ?? 5);
        if (Array.isArray(mentionedJids) && mentionedJids.length >= mentionThreshold) {
          const adminBypass = settings.antiMention?.adminBypass ?? true;
          let isSenderExempt = false;
          if (adminBypass) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderExempt = !!adminStatus?.isSenderAdmin;
          }
          if (!isSenderExempt) {
            await sock.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: false, id: message.key.id, participant: senderId } }).catch(() => {});
            await sock.sendMessage(chatId, { text: '⚠️ *Anti-mention activé*\n\n❌ Mention de masse détectée (' + mentionedJids.length + ').\nMerci d\'éviter de mentionner tout le monde.', contextInfo: channelInfo.contextInfo }, { quoted: message }).catch(() => {});
          }
        }
      }
    } catch (error) { console.error('ANTI-MENTION error:', error); }
    
    const isSenderSudo = await isSudo(senderId);
    const isSenderOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
    
    if (message.message?.buttonsResponseMessage) {
      const buttonId = message.message.buttonsResponseMessage.selectedButtonId;
      const buttonChatId = message.key.remoteJid;
      if (buttonId === 'channel') {
        await sock.sendMessage(buttonChatId, { text: '📢 *Rejoins notre Groupe:*\nhttps://chat.whatsapp.com/Bccy7Hk6NIa8GG5liFstGM?s=cl&p=a&mlu=4&ilr=4&iam=2' }, { quoted: message });
        return;
      } else if (buttonId === 'owner') {
        const ownerButtonHandler = require('./commands/owner');
        await ownerButtonHandler(sock, buttonChatId);
        return;
      } else if (buttonId === 'support') {
        await sock.sendMessage(buttonChatId, { text: '🔗 *Support*\n\nhttps://whatsapp.com/channel/0029VbC8KUk2kNFp2Fb0bF3J' }, { quoted: message });
        return;
      }
    }
    
    const rawText = (message.message?.conversation?.trim() || message.message?.extendedTextMessage?.text?.trim() || message.message?.imageMessage?.caption?.trim() || message.message?.videoMessage?.caption?.trim() || message.message?.buttonsResponseMessage?.selectedButtonId?.trim() || '').trim();
    const configuredPrefix = readPrefixFromSettingsFile() || settings?.prefix || '.';
    const prefixList = Array.isArray(configuredPrefix) ? configuredPrefix : [configuredPrefix];
    const matchedPrefix = prefixList.find(prefixCandidate => prefixCandidate && rawText.startsWith(prefixCandidate));
    const normalizedText = matchedPrefix ? '.' + rawText.slice(matchedPrefix.length) : rawText;
    const command = normalizedText.toLowerCase().replace(/\.\s+/g, '.').trim();
    
    if (matchedPrefix && command.startsWith('.')) console.log('📝 Command used in ' + (isGroup ? 'group' : 'private') + ': ' + command);
    
    let isPublicMode = true;
    try {
      const accessModeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
      if (typeof accessModeData.isPublic === 'boolean') isPublicMode = accessModeData.isPublic;
    } catch (error) {}
    
    const isBotOrOwner = message.key.fromMe || isSenderOwnerOrSudo;
    
    if (isBanned(senderId) && !command.startsWith('.unban')) {
      if (Math.random() < 0.1) await sock.sendMessage(chatId, { text: '❌ You are banned from using the bot. Contact an admin to get unbanned.', ...channelInfo });
      return;
    }
    
    if (/^[1-9]$/.test(command) || command.toLowerCase() === 'surrender') {
      await handleTicTacToeMove(sock, chatId, senderId, command);
      return;
    }
    
    if (!message.key.fromMe) incrementMessageCount(chatId, senderId);
    
    if (isGroup) {
      command && await handleBadwordDetection(sock, chatId, message, command, senderId);
      await Antilink(message, sock);
    }
    
    if (!isGroup && !message.key.fromMe && !isSenderSudo) {
      try {
        const pmBlockerState = readPmBlockerState();
        if (pmBlockerState.enabled) {
          await sock.sendMessage(chatId, { text: pmBlockerState.message || 'Private messages are blocked. Please contact the owner in groups only.' });
          await new Promise(resolve => setTimeout(resolve, 1500));
          try { await sock.updateBlockStatus(chatId, 'block'); } catch (error) {}
          return;
        }
      } catch (error) {}
    }
    
    if (!command.startsWith('.') || !matchedPrefix) {
      await handleAutotypingForMessage(sock, chatId, command);
      if (isGroup) {
        await handleTagDetection(sock, chatId, message, senderId);
        await handleMentionDetection(sock, chatId, message);
        (isPublicMode || isBotOrOwner) && await handleChatbotResponse(sock, chatId, message, command, senderId);
      }
      return;
    }
    
    if (!isPublicMode && !isBotOrOwner) return;
    
    const adminCommands = ['.close','.open','.ban','.unban','.promote','.demote','.kick','.tagall','.tagnotadmin','.hidetag','.antilink','.antitag','.setgdesc','.setgname','.setgpp'];
    const isAdminCommand = adminCommands.some(adminCommand => command.startsWith(adminCommand));
    const ownerOnlyCommands = ['.mode','.autostatus','.antidelete','.cleartmp','.setpp','.clearsession','.areact','.autoreact','.autotyping','.autoread','.pmblocker', '.vv2'];
    const isOwnerOnlyCommand = ownerOnlyCommands.some(ownerOnlyCommand => command.startsWith(ownerOnlyCommand));
    
    let isSenderAdmin = false;
    let isBotAdmin = false;
    
    if (isGroup && isAdminCommand) {
      const adminInfo = await isAdmin(sock, chatId, senderId);
      isSenderAdmin = adminInfo.isSenderAdmin;
      isBotAdmin = adminInfo.isBotAdmin;
      if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use admin commands.', ...channelInfo }, { quoted: message });
        return;
      }
      if (command.startsWith('.close') || command === '.open' || command.startsWith('.mute') || command === '.unmute' || command.startsWith('.ban') || command.startsWith('.unban') || command.startsWith('.promote') || command.startsWith('.demote')) {
        if (!isSenderAdmin && !message.key.fromMe) {
          await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use this command.', ...channelInfo }, { quoted: message });
          return;
        }
      }
    }
    
    if (isOwnerOnlyCommand) {
      if (!message.key.fromMe && !isSenderOwnerOrSudo) {
        await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner or sudo!' }, { quoted: message });
        return;
      }
    }
    
    let showTypingAfter = false;
    
    switch (true) {
    // Commande pour configurer l'emoji
    case command.startsWith('.vv2 set '): {
        if (!message.key.fromMe && !isSenderOwnerOrSudo) return await sock.sendMessage(chatId, { text: '❌ Seul le propriétaire peut configurer ça.' });
        const newEmoji = rawText.split(' ').slice(2).join(' ').trim();
        if (!newEmoji) return await sock.sendMessage(chatId, { text: '❌ Exemple : .vv2 set 🧭' }, { quoted: message });
        try {
            fs.writeFileSync('./data/vv2.json', JSON.stringify({ emoji: newEmoji }, null, 2));
            await sock.sendMessage(chatId, { text: `✅ Emoji secret configuré : ${newEmoji}\n\nRéagis avec cet emoji à une Vue Unique pour l'intercepter.` }, { quoted: message });
        } catch (e) { await sock.sendMessage(chatId, { text: '❌ Erreur de sauvegarde.' }, { quoted: message }); }
        break;
    }
    case command === '.simage': {
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMessage?.stickerMessage) await simageCommand(sock, quotedMessage, chatId);
        else await sock.sendMessage(chatId, { text: 'Veuillez répondre à un sticker avec la commande .simage pour le convertir en image.', ...channelInfo }, { quoted: message });
        showTypingAfter = true;
        break;
    }
    case command === '.kickall': await kickallCommand(sock, chatId, senderId, message); break;
    case command.startsWith('.kick'): { const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid || []; await kickCommand(sock, chatId, senderId, mentionedJid, message); } break;
    case command.startsWith('.close'):
    case command.startsWith('.mute'): {
        const parts = command.trim().split(/\s+/); const durationArg = parts[1]; const durationMs = parseDurationToMs(durationArg);
        if (durationArg !== undefined && durationMs === null) await sock.sendMessage(chatId, { text: '❌ Durée invalide.\n✅ Exemples : *.close 2m* | *.close 30s* | *.close* (sans durée)', ...channelInfo }, { quoted: message });
        else await muteCommand(sock, chatId, senderId, message, durationMs);
    } break;
    case command === '.open':
    case command === '.umute':
    case command === '.unmute': {
        const parts = command.trim().split(/\s+/); const durationArg = parts[1]; const durationMs = parseDurationToMs(durationArg);
        if (durationArg !== undefined && durationMs === null) await sock.sendMessage(chatId, { text: '❌ Durée invalide.\n✅ Exemples : *.open 2m* | *.open 30s* | *.open* (sans durée)', ...channelInfo }, { quoted: message });
        else await unmuteCommand(sock, chatId, senderId, message, durationMs);
    } break;
    case command.startsWith('.ban'):
      if (!isGroup && !message.key.fromMe && !isSenderSudo) { await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .ban in private chat.' }, { quoted: message }); break; }
      await banCommand(sock, chatId, message); break;
    case command.startsWith('.unban'):
      if (!isGroup && !message.key.fromMe && !isSenderSudo) { await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .unban in private chat.' }, { quoted: message }); break; }
      await unbanCommand(sock, chatId, message); break;
    case command === '.help' || command === '.menu' || command === '.bot' || command === '.list':
      try { if (command === '.menu') await sock.sendMessage(chatId, { react: { text: '👑', key: message.key } }); } catch {}
      await helpCommand(sock, chatId, message, global.channelLink); showTypingAfter = true; break;
    case command === '.sticker' || command === '.s': await stickerCommand(sock, chatId, message); showTypingAfter = true; break;
    case command.startsWith('.warnings'): { const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid || []; await warningsCommand(sock, chatId, mentionedJid); } break;
    case command.startsWith('.warn'): { const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid || []; await warnCommand(sock, chatId, senderId, mentionedJid, message); } break;
    case command.startsWith('.tts'): { const ttsText = command.slice(4).trim(); await ttsCommand(sock, chatId, ttsText, message); } break;
    case command.startsWith('.delete') || command.startsWith('.del'): await deleteCommand(sock, chatId, message, senderId); break;
    case command.startsWith('.attp'): await attpCommand(sock, chatId, message); break;
    case command === '.settings': await settingsCommand(sock, chatId, message); break;
    case command.startsWith('.mode'): {
        if (!message.key.fromMe && !isSenderOwnerOrSudo) { await sock.sendMessage(chatId, { text: 'Only bot owner can use this command!', ...channelInfo }, { quoted: message }); return; }
        let accessModeData;
        try { accessModeData = JSON.parse(fs.readFileSync('./data/messageCount.json')); } catch (error) { await sock.sendMessage(chatId, { text: 'Failed to read bot mode status', ...channelInfo }); return; }
        const requestedMode = command.split(' ')[1]?.toLowerCase();
        if (!requestedMode) {
          const currentMode = accessModeData.isPublic ? 'public' : 'private';
          await sock.sendMessage(chatId, { text: 'Current bot mode: *' + currentMode + '*\n\nUsage: .mode public/private', ...channelInfo }, { quoted: message }); return;
        }
        if (requestedMode !== 'public' && requestedMode !== 'private') { await sock.sendMessage(chatId, { text: 'Usage: .mode public/private', ...channelInfo }, { quoted: message }); return; }
        try {
          accessModeData.isPublic = requestedMode === 'public';
          fs.writeFileSync('./data/messageCount.json', JSON.stringify(accessModeData, null, 2));
          await sock.sendMessage(chatId, { text: 'Bot is now in *' + requestedMode + '* mode', ...channelInfo });
        } catch (error) { await sock.sendMessage(chatId, { text: 'Failed to update bot access mode', ...channelInfo }); }
    } break;
    case command.startsWith('.anticall'):
      if (!message.key.fromMe && !isSenderOwnerOrSudo) { await sock.sendMessage(chatId, { text: 'Only owner/sudo can use anticall.' }, { quoted: message }); break; }
      { const anticallArgs = command.split(' ').slice(1).join(' '); await anticallCommand(sock, chatId, message, anticallArgs); } break;
    case command.startsWith('.pmblocker'): { const pmBlockerArgs = command.split(' ').slice(1).join(' '); await pmblockerCommand(sock, chatId, message, pmBlockerArgs); } showTypingAfter = true; break;
    case command === '.owner': await ownerCommand(sock, chatId); break;
    case command === '.tagall': await tagAllCommand(sock, chatId, senderId, message); break;
    case command === '.tagnotadmin': await tagNotAdminCommand(sock, chatId, senderId, message); break;
    case command.startsWith('.hidetag'): { const hideTagText = rawText.slice(8).trim(); const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null; await hideTagCommand(sock, chatId, senderId, hideTagText, quotedMessage, message); } break;
    case command.startsWith('.tag'): { const tagText = rawText.slice(4).trim(); const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null; await tagCommand(sock, chatId, senderId, tagText, quotedMessage, message); } break;
    case command.startsWith('.antilink'):
      if (!isGroup) { await sock.sendMessage(chatId, { text: 'This command can only be used in groups.', ...channelInfo }, { quoted: message }); return; }
      if (!isBotAdmin) { await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.', ...channelInfo }, { quoted: message }); return; }
      await handleAntilinkCommand(sock, chatId, command, senderId, isSenderAdmin, message); break;
    case command.startsWith('.antitag'):
      if (!isGroup) { await sock.sendMessage(chatId, { text: 'This command can only be used in groups.', ...channelInfo }, { quoted: message }); return; }
      if (!isBotAdmin) { await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.', ...channelInfo }, { quoted: message }); return; }
      await handleAntitagCommand(sock, chatId, command, senderId, isSenderAdmin, message); break;
    case command === '.meme': await memeCommand(sock, chatId, message); break;
    case command === '.joke': await jokeCommand(sock, chatId, message); break;
    case command === '.quote': await quoteCommand(sock, chatId, message); break;
    case command === '.fact': await factCommand(sock, chatId, message, message); break;
    case command.startsWith('.meteo'): { const city = command.slice(7).trim(); await weatherCommand(sock, chatId, message, city); } break;
    case command.startsWith('.weather'): { const city = command.slice(9).trim(); if (city) await weatherCommand(sock, chatId, message, city); else await sock.sendMessage(chatId, { text: 'Veuillez préciser une ville, ex : .meteo Abidjan', ...channelInfo }, { quoted: message }); } break;
    case command === '.nouvelle': await newsCommand(sock, chatId); break;
    case command === '.news': await newsCommand(sock, chatId); break;
    case command.startsWith('.ttt') || command.startsWith('.tictactoe'): { const gameArgs = command.split(' ').slice(1).join(' '); await tictactoeCommand(sock, chatId, senderId, gameArgs); } break;
    case command.startsWith('.move'): { const position = parseInt(command.split(' ')[1]); if (isNaN(position)) await sock.sendMessage(chatId, { text: 'Please provide a valid position number for Tic-Tac-Toe move.', ...channelInfo }, { quoted: message }); else handleTicTacToeMove(sock, chatId, senderId, String(position)); } break;
    case command === '.topmembers': topMembers(sock, chatId, isGroup); break;
    case command.startsWith('.hangman'): startHangman(sock, chatId); break;
    case command.startsWith('.guess'): { const letter = command.split(' ')[1]; if (letter) guessLetter(sock, chatId, letter); else sock.sendMessage(chatId, { text: 'Please guess a letter using .guess <letter>', ...channelInfo }, { quoted: message }); } break;
    case command.startsWith('.trivia'): startTrivia(sock, chatId); break;
    case command.startsWith('.answer'): { const answer = command.split(' ').slice(1).join(' '); if (answer) answerTrivia(sock, chatId, answer); else sock.sendMessage(chatId, { text: 'Please provide an answer using .answer <answer>', ...channelInfo }, { quoted: message }); } break;
    case command.startsWith('.compliment'): await complimentCommand(sock, chatId, message); break;
    case command.startsWith('.insult'): await insultCommand(sock, chatId, message); break;
    case command.startsWith('.8ball'): { const question = command.split(' ').slice(1).join(' '); await eightBallCommand(sock, chatId, question); } break;
    case command.startsWith('.lyrics'): { const songQuery = command.split(' ').slice(1).join(' '); await lyricsCommand(sock, chatId, songQuery, message); } break;
    case command.startsWith('.simp'): { const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage; const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || []; await simpCommand(sock, chatId, quotedMessage, mentionedJids, senderId); } break;
    case command.startsWith('.stupid') || command.startsWith('.itssostupid') || command.startsWith('.iss'): { const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage; const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || []; const stupidArgs = command.split(' ').slice(1); await stupidCommand(sock, chatId, quotedMessage, mentionedJids, senderId, stupidArgs); } break;
    case command === '.dare': await dareCommand(sock, chatId, message); break;
    case command === '.truth': await truthCommand(sock, chatId, message); break;
    case command === '.clear': if (isGroup) await clearCommand(sock, chatId); break;
    case command.startsWith('.promote'): { const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid || []; await promoteCommand(sock, chatId, mentionedJid, message); } break;
    case command.startsWith('.demote'): { const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid || []; await demoteCommand(sock, chatId, mentionedJid, message); } break;
    case command === '.ping': await pingCommand(sock, chatId, message); break;
    case command === '.alive': await aliveCommand(sock, chatId, message); break;
    case command.startsWith('.mention '): { const argsText = command.split(' ').slice(1).join(' '); const isAuthorized = message.key.fromMe || isSenderSudo; await mentionToggleCommand(sock, chatId, message, argsText, isAuthorized); } break;
    case command === '.setmention': { const isAuthorized = message.key.fromMe || isSenderSudo; await setMentionCommand(sock, chatId, message, isAuthorized); } break;
    case command.startsWith('.blur'): { const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage; await blurCommand(sock, chatId, message, quotedMessage); } break;
    case command.startsWith('.welcome'):
      if (isGroup) {
        if (!isSenderAdmin) { const adminInfo = await isAdmin(sock, chatId, senderId); isSenderAdmin = adminInfo.isSenderAdmin; }
        if (isSenderAdmin || message.key.fromMe) await welcomeCommand(sock, chatId, message);
        else await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use this command.', ...channelInfo }, { quoted: message });
      } else await sock.sendMessage(chatId, { text: 'This command can only be used in groups.', ...channelInfo }, { quoted: message });
      break;
    case command.startsWith('.goodbye'):
      if (isGroup) {
        if (!isSenderAdmin) { const adminInfo = await isAdmin(sock, chatId, senderId); isSenderAdmin = adminInfo.isSenderAdmin; }
        if (isSenderAdmin || message.key.fromMe) await goodbyeCommand(sock, chatId, message);
        else await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use this command.', ...channelInfo }, { quoted: message });
      } else await sock.sendMessage(chatId, { text: 'This command can only be used in groups.', ...channelInfo }, { quoted: message });
      break;
    case command === '.git':
    case command === '.github':
    case command === '.sc':
    case command === '.script':
    case command === '.repo': await githubCommand(sock, chatId, message); break;
    case command.startsWith('.antibadword'): {
        if (!isGroup) { await sock.sendMessage(chatId, { text: 'This command can only be used in groups.', ...channelInfo }, { quoted: message }); return; }
        const adminInfo = await isAdmin(sock, chatId, senderId); isSenderAdmin = adminInfo.isSenderAdmin; isBotAdmin = adminInfo.isBotAdmin;
        if (!isBotAdmin) { await sock.sendMessage(chatId, { text: '*Bot must be admin to use this feature*', ...channelInfo }, { quoted: message }); return; }
        await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
      } break;
    case command.startsWith('.chatbot'): {
        if (!isGroup) { await sock.sendMessage(chatId, { text: 'This command can only be used in groups.', ...channelInfo }, { quoted: message }); return; }
        const adminInfo = await isAdmin(sock, chatId, senderId);
        if (!adminInfo.isSenderAdmin && !message.key.fromMe) { await sock.sendMessage(chatId, { text: '*Only admins or bot owner can use this command*', ...channelInfo }, { quoted: message }); return; }
        const chatbotArgs = command.slice(8).trim(); await handleChatbotCommand(sock, chatId, message, chatbotArgs);
      } break;
    case command.startsWith('.take') || command.startsWith('.steal'): { const isSteal = command.startsWith('.steal'); const prefixLength = isSteal ? 6 : 5; const takeArgs = rawText.slice(prefixLength).trim().split(' '); await takeCommand(sock, chatId, message, takeArgs); } break;
    case command === '.flirt': await flirtCommand(sock, chatId, message); break;
    case command.startsWith('.character'): await characterCommand(sock, chatId, message); break;
    case command.startsWith('.waste'): await wastedCommand(sock, chatId, message); break;
    case command === '.ship': if (!isGroup) { await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo }, { quoted: message }); return; } await shipCommand(sock, chatId, message); break;
    case command === '.groupinfo' || command === '.infogp' || command === '.infogrupo': if (!isGroup) { await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo }, { quoted: message }); return; } await groupInfoCommand(sock, chatId, message); break;
    case command === '.resetlink' || command === '.revoke' || command === '.anularlink': if (!isGroup) { await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo }, { quoted: message }); return; } await resetlinkCommand(sock, chatId, senderId); break;
    case command === '.staff' || command === '.admins' || command === '.listadmin': if (!isGroup) { await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo }, { quoted: message }); return; } await staffCommand(sock, chatId, message); break;
    case command.startsWith('.tourl') || command.startsWith('.url'): await urlCommand(sock, chatId, message); break;
    case command.startsWith('.emojimix') || command.startsWith('.emix'): await emojimixCommand(sock, chatId, message); break;
    case command.startsWith('.tg') || command.startsWith('.stickertelegram') || command.startsWith('.tgsticker') || command.startsWith('.telesticker'): await stickerTelegramCommand(sock, chatId, message); break;
    case command === '.vv': await viewOnceCommand(sock, chatId, message); break;
    case command === '.clearsession' || command === '.clearsesi': await clearSessionCommand(sock, chatId, message); break;
    case command.startsWith('.autostatus'): { const autoStatusArgs = command.split(' ').slice(1); await autoStatusCommand(sock, chatId, message, autoStatusArgs); } break;
    case command.startsWith('.metallic'): await textmakerCommand(sock, chatId, message, command, 'metallic'); break;
    case command.startsWith('.ice'): await textmakerCommand(sock, chatId, message, command, 'ice'); break;
    case command.startsWith('.snow'): await textmakerCommand(sock, chatId, message, command, 'snow'); break;
    case command.startsWith('.impressive'): await textmakerCommand(sock, chatId, message, command, 'impressive'); break;
    case command.startsWith('.matrix'): await textmakerCommand(sock, chatId, message, command, 'matrix'); break;
    case command.startsWith('.light'): await textmakerCommand(sock, chatId, message, command, 'light'); break;
    case command.startsWith('.neon'): await textmakerCommand(sock, chatId, message, command, 'neon'); break;
    case command.startsWith('.devil'): await textmakerCommand(sock, chatId, message, command, 'devil'); break;
    case command.startsWith('.purple'): await textmakerCommand(sock, chatId, message, command, 'purple'); break;
    case command.startsWith('.thunder'): await textmakerCommand(sock, chatId, message, command, 'thunder'); break;
    case command.startsWith('.leaves'): await textmakerCommand(sock, chatId, message, command, 'leaves'); break;
    case command.startsWith('.1917'): await textmakerCommand(sock, chatId, message, command, '1917'); break;
    case command.startsWith('.arena'): await textmakerCommand(sock, chatId, message, command, 'arena'); break;
    case command.startsWith('.hacker'): await textmakerCommand(sock, chatId, message, command, 'hacker'); break;
    case command.startsWith('.sand'): await textmakerCommand(sock, chatId, message, command, 'sand'); break;
    case command.startsWith('.blackpink'): await textmakerCommand(sock, chatId, message, command, 'blackpink'); break;
    case command.startsWith('.glitch'): await textmakerCommand(sock, chatId, message, command, 'glitch'); break;
    case command.startsWith('.fire'): await textmakerCommand(sock, chatId, message, command, 'fire'); break;
    case command.startsWith('.antidelete'): { const antideleteArgs = command.slice(11).trim(); await handleAntideleteCommand(sock, chatId, message, antideleteArgs); } break;
    case command === '.surrender': await handleTicTacToeMove(sock, chatId, senderId, 'surrender'); break;
    case command === '.cleartmp': await clearTmpCommand(sock, chatId, message); break;
    case command === '.setpp': await setProfilePicture(sock, chatId, message); break;
    case command.startsWith('.setgdesc'): { const description = rawText.slice(9).trim(); await setGroupDescription(sock, chatId, senderId, description, message); } break;
    case command.startsWith('.setgname'): { const groupName = rawText.slice(9).trim(); await setGroupName(sock, chatId, senderId, groupName, message); } break;
    case command.startsWith('.setgpp'): await setGroupPhoto(sock, chatId, senderId, message); break;
    case command.startsWith('.instagram') || command.startsWith('.insta') || (command === '.ig' || command.startsWith('.ig ')): await instagramCommand(sock, chatId, message); break;
    case command.startsWith(prefix + 'apk ') || command === prefix + 'apk': await apkCommand(sock, chatId, message); return;
    case command.startsWith(prefix + 'apkdl ') || command === prefix + 'apkdl': await apkdlCommand(sock, chatId, message); return;
    case command.startsWith(prefix + 'pinterest') || command.startsWith(prefix + 'pin') || command.startsWith(prefix + 'pindl') || command.startsWith(prefix + 'pinterestdl'): await pinterestCommand(sock, chatId, message); return;
    case command.startsWith(prefix + 'antimention'): await antiMentionCommand(sock, chatId, command, senderId, isSenderAdmin, message); return;
    case command.startsWith(prefix + 'setprefix'): await setPrefixCommand(sock, chatId, message); return;
    case command.startsWith('.igsc'): await igsCommand(sock, chatId, message, true); break;
    case command.startsWith('.igs'): await igsCommand(sock, chatId, message, false); break;
    case command.startsWith('.fb') || command.startsWith('.facebook'): await facebookCommand(sock, chatId, message); break;
    case command.startsWith('.music'): await playCommand(sock, chatId, message); break;
    case command.startsWith('.spotify'): await spotifyCommand(sock, chatId, message); break;
    case command.startsWith('.play') || command.startsWith('.mp3') || command.startsWith('.ytmp3') || command.startsWith('.song'): await songCommand(sock, chatId, message); break;
    case command.startsWith('.video') || command.startsWith('.ytmp4'): await videoCommand(sock, chatId, message); break;
    case command.startsWith('.tiktok') || command.startsWith('.tt'): await handleTikTokCommand(sock, chatId, message); break;
    case command.startsWith('.gpt') || command.startsWith('.gemini'): await aiCommand(sock, chatId, message); break;
    case command.startsWith('.translate') || command.startsWith('.trt'): { const commandLength = command.startsWith('.translate') ? 10 : 4; await handleTranslateCommand(sock, chatId, message, command.slice(commandLength)); } return;
    case command.startsWith('.ss') || command.startsWith('.ssweb') || command.startsWith('.screenshot'): { const commandLength = command.startsWith('.screenshot') ? 11 : command.startsWith('.ssweb') ? 6 : 3; await handleSsCommand(sock, chatId, message, command.slice(commandLength).trim()); } break;
    case command.startsWith('.areact') || command.startsWith('.autoreact') || command.startsWith('.autoreaction'): await handleAreactCommand(sock, chatId, message, isBotOrOwner); break;
    case command.startsWith('.sudo'): await sudoCommand(sock, chatId, message); break;
    case command === '.goodnight' || command === '.lovenight' || command === '.gn': await goodnightCommand(sock, chatId, message); break;
    case command === '.shayari' || command === '.shayri': await shayariCommand(sock, chatId, message); break;
    case command === '.roseday': await rosedayCommand(sock, chatId, message); break;
    case command.startsWith('.imagine') || command.startsWith('.flux') || command.startsWith('.dalle'): await imagineCommand(sock, chatId, message); break;
    case command === '.jid': await handleJidCommand(sock, chatId, message); break;
    case command.startsWith('.autotyping'): await autotypingCommand(sock, chatId, message); showTypingAfter = true; break;
    case command.startsWith('.autoread'): await autoreadCommand(sock, chatId, message); showTypingAfter = true; break;
    case command.startsWith('.heart'): await handleHeart(sock, chatId, message); break;
    case command.startsWith('.horny'): { const parts = command.trim().split(/\s+/); const commandArgs = ['horny', ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.circle'): { const parts = command.trim().split(/\s+/); const commandArgs = ['circle', ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.lgbt'): { const parts = command.trim().split(/\s+/); const commandArgs = ['lgbt', ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.lolice'): { const parts = command.trim().split(/\s+/); const commandArgs = ['lolice', ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.simpcard'): { const parts = command.trim().split(/\s+/); const commandArgs = ['simpcard', ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.tonikawa'): { const parts = command.trim().split(/\s+/); const commandArgs = ['tonikawa', ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.its-so-stupid'): { const parts = command.trim().split(/\s+/); const commandArgs = ['its-so-stupid', ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.namecard'): { const parts = command.trim().split(/\s+/); const commandArgs = ['namecard', ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.oogway2'):
    case command.startsWith('.oogway'): { const parts = command.trim().split(/\s+/); const effectName = command.startsWith('.oogway2') ? 'oogway2' : 'oogway'; const commandArgs = [effectName, ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.tweet'): { const parts = command.trim().split(/\s+/); const commandArgs = ['tweet', ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.ytcomment'): { const parts = command.trim().split(/\s+/); const commandArgs = ['youtube-comment', ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.comrade'):
    case command.startsWith('.gay'):
    case command.startsWith('.glass'):
    case command.startsWith('.jail'):
    case command.startsWith('.passed'):
    case command.startsWith('.triggered'): { const parts = command.trim().split(/\s+/); const effectName = command.slice(1).split(/\s+/)[0]; const commandArgs = [effectName, ...parts.slice(1)]; await miscCommand(sock, chatId, message, commandArgs); } break;
    case command.startsWith('.animu'): { const parts = command.trim().split(/\s+/); const animeArgs = parts.slice(1); await animeCommand(sock, chatId, message, animeArgs); } break;
    case command.startsWith('.nom'):
    case command.startsWith('.poke'):
    case command.startsWith('.cry'):
    case command.startsWith('.kiss'):
    case command.startsWith('.pat'):
    case command.startsWith('.hug'):
    case command.startsWith('.wink'):
    case command.startsWith('.facepalm'):
    case command.startsWith('.face-palm'):
    case command.startsWith('.animuquote'):
    case command.startsWith('.quote'):
    case command.startsWith('.loli'): { const parts = command.trim().split(/\s+/); let animeAction = parts[0].slice(1); if (animeAction === 'facepalm') animeAction = 'face-palm'; if (animeAction === 'quote' || animeAction === 'animuquote') animeAction = 'quote'; await animeCommand(sock, chatId, message, [animeAction]); } break;
    case command === '.crop': await stickercropCommand(sock, chatId, message); showTypingAfter = true; break;
    case command.startsWith('.pies'): { const parts = rawText.trim().split(/\s+/); const countryArgs = parts.slice(1); await piesCommand(sock, chatId, message, countryArgs); showTypingAfter = true; } break;
    case command === '.china': await piesAlias(sock, chatId, message, 'china'); showTypingAfter = true; break;
    case command === '.indonesia': await piesAlias(sock, chatId, message, 'indonesia'); showTypingAfter = true; break;
    case command === '.japan': await piesAlias(sock, chatId, message, 'japan'); showTypingAfter = true; break;
    case command === '.korea': await piesAlias(sock, chatId, message, 'korea'); showTypingAfter = true; break;
    case command === '.india': await piesAlias(sock, chatId, message, 'india'); showTypingAfter = true; break;
    case command === '.malaysia': await piesAlias(sock, chatId, message, 'malaysia'); showTypingAfter = true; break;
    case command === '.thailand': await piesAlias(sock, chatId, message, 'thailand'); showTypingAfter = true; break;
    case command.startsWith('.update'): { const parts = rawText.trim().split(/\s+/); const updateUrl = parts[1] && parts[1].startsWith('http') ? parts[1] : ''; await updateCommand(sock, chatId, message, updateUrl); } showTypingAfter = true; break;
    case command.startsWith('.removebg') || command.startsWith('.rmbg') || command.startsWith('.nobg'): await removebgCommand.exec(sock, message, command.split(' ').slice(1)); break;
    case command.startsWith('.remini') || command.startsWith('.enhance') || command.startsWith('.upscale'): await reminiCommand(sock, chatId, message, command.split(' ').slice(1)); break;
    case command.startsWith('.sora'): await soraCommand(sock, chatId, message); break;
    default:
      if (isGroup) {
        command && await handleChatbotResponse(sock, chatId, message, command, senderId);
        await handleTagDetection(sock, chatId, message, senderId);
        await handleMentionDetection(sock, chatId, message);
      }
      showTypingAfter = false;
      break;
    }
    
    if (showTypingAfter !== false) await showTypingAfterCommand(sock, chatId);
    if (command.startsWith('.')) await addCommandReaction(sock, message);
  } catch (error) {
    console.error('❌ Error in message handler:', error.message);
    if (chatId) await sock.sendMessage(chatId, { text: '❌ Failed to process command!', ...channelInfo });
  }
}

async function handleGroupParticipantUpdate(sock, update) {
  try {
    const { id: groupId, participants, action, author } = update;
    if (!groupId.endsWith('@g.us')) return;
    let isPublicMode = true;
    try {
      const accessModeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
      if (typeof accessModeData.isPublic === 'boolean') isPublicMode = accessModeData.isPublic;
    } catch (error) {}
    if (action === 'promote') { if (!isPublicMode) return; await handlePromotionEvent(sock, groupId, participants, author); return; }
    if (action === 'demote') { if (!isPublicMode) return; await handleDemotionEvent(sock, groupId, participants, author); return; }
    if (action === 'add') await handleJoinEvent(sock, groupId, participants);
    if (action === 'remove') await handleLeaveEvent(sock, groupId, participants);
  } catch (error) { console.error('Error in handleGroupParticipantUpdate:', error); }
}

module.exports = {
  handleMessages,
  handleGroupParticipantUpdate,
  handleStatus: async (sock, statusUpdate) => { await handleStatusUpdate(sock, statusUpdate); }
};