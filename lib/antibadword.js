const { 
    setAntiBadword, 
    getAntiBadword, 
    removeAntiBadword, 
    incrementWarningCount, 
    resetWarningCount 
} = require('../lib/index');

/**
 * =========================
 *  CONFIG : .antibadword
 * =========================
 */
async function handleAntiBadwordCommand(sock, chatId, message, match) {
    // Cette commande doit être utilisée en groupe
    if (!chatId.endsWith('@g.us')) {
        return sock.sendMessage(chatId, {
            text:
`╭──❏ 🛡️ *ANTIBADWORD*
│
│ ❌ Cette commande fonctionne uniquement dans un groupe.
╰──❏`
        }, { quoted: message });
    }

    // Aide
    if (!match) {
        return sock.sendMessage(chatId, {
            text:
`╭──❏ 🛡️ *ANTIBADWORD*
│
│ ✅ Activer :
│ *┋ ➥ .antibadword on*
│
│ ⚙️ Choisir l'action :
│ *┋ ➥ .antibadword set delete*  (supprime)
│ *┋ ➥ .antibadword set warn*    (avertit)
│ *┋ ➥ .antibadword set kick*    (expulse)
│
│ ⛔ Désactiver :
│ *┋ ➥ .antibadword off*
╰──❏`
        }, { quoted: message });
    }

    const arg = match.trim().toLowerCase();

    // ON
    if (arg === 'on') {
        const config = await getAntiBadword(chatId, 'on');
        if (config?.enabled) {
            return sock.sendMessage(chatId, {
                text:
`╭──❏ 🛡️ *ANTIBADWORD*
│ ✅ Déjà activé dans ce groupe.
╰──❏`
            }, { quoted: message });
        }
        // Par défaut : delete
        await setAntiBadword(chatId, 'on', 'delete');
        return sock.sendMessage(chatId, {
            text:
`╭──❏ 🛡️ *ANTIBADWORD*
│ ✅ Activé avec succès.
│ ⚙️ Action actuelle : *delete*
│
│ Change l'action :
│ *┋ ➥ .antibadword set warn*
│ *┋ ➥ .antibadword set kick*
╰──❏`
        }, { quoted: message });
    }

    // OFF
    if (arg === 'off') {
        const config = await getAntiBadword(chatId, 'on');
        if (!config?.enabled) {
            return sock.sendMessage(chatId, {
                text:
`╭──❏ 🛡️ *ANTIBADWORD*
│ ⚠️ Déjà désactivé.
╰──❏`
            }, { quoted: message });
        }
        await removeAntiBadword(chatId);
        return sock.sendMessage(chatId, {
            text:
`╭──❏ 🛡️ *ANTIBADWORD*
│ ❌ Désactivé dans ce groupe.
╰──❏`
        }, { quoted: message });
    }

    // SET ACTION
    if (arg.startsWith('set')) {
        const parts = arg.split(/\s+/);
        const action = parts[1];

        if (!action || !['delete', 'kick', 'warn'].includes(action)) {
            return sock.sendMessage(chatId, {
                text:
`╭──❏ 🛡️ *ANTIBADWORD*
│ ❌ Action invalide.
│ ✅ Choisis : *delete* / *warn* / *kick*
╰──❏`
            }, { quoted: message });
        }

        await setAntiBadword(chatId, 'on', action);
        return sock.sendMessage(chatId, {
            text:
`╭──❏ 🛡️ *ANTIBADWORD*
│ ✅ Action définie : *${action}*
╰──❏`
        }, { quoted: message });
    }

    return sock.sendMessage(chatId, {
        text:
`╭──❏ 🛡️ *ANTIBADWORD*
│ ❌ Commande invalide.
│ Tape : *.antibadword*
╰──❏`
    }, { quoted: message });
}

/**
 * =========================
 *  DÉTECTION AUTOMATIQUE
 * =========================
 */
async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
    // Groupe uniquement
    if (!chatId.endsWith('@g.us')) return;

    // Ignore messages du bot
    if (message.key.fromMe) return;

    // Charger la config (source unique)
    const antiBadwordConfig = await getAntiBadword(chatId, 'on');
    if (!antiBadwordConfig?.enabled) return;

    // Convert message to lowercase and clean it
    const cleanMessage = (userMessage || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleanMessage) return;

    // Liste existante (on garde pour ne rien casser)
    const badWords = [
        'connard', 'baise', 'baiser', 'salo', 'foutre', 'con', 
        'gueule', 'pétasse', 'pute', 'bite', 'ton modia', 'maudit là', 
        "je t'en merde", 'fils de pute', 'vilin', 'vilain', 
        'ton babiere', "je t'en cul", 'boobs', 'masisi', 'vòlè', 'langyèt', 'langyèt manman', 'fout', 'myad', 'manje kaka', 'manje kk', 'syee', 'boobies', 'pine', 'idiot', 'imbecile', 'fuck', 
        'djandjou', 'bitch', 'batard', 'ton cui', 'gros cui', 'pd', 'va mourir', 
        "je t'en merde", 'aimer', 'jtm', 'PD', 'chien', 'je vais te tuer',
        'shit', 'damn', 'hell', "je t'aime", 'bb', 'i love you', 'love u', 'sale porc',
        'motherfucker', 'sakura', 'baku', 'chette', 'bebe', 'chouchou', 'mon amour', 'cheri', 
        'ma vie', 'soulard', 'vas là bas', 'sorcier', 'sorciere', 'tu es nul', 'nul', "multiplication d'argent",
        'Marabout', "Multiplication d'argent", 'sexe', 'putin', 'bordel', 'tu es un animale',
        'vas au diable', 'mougou', 'grê', 'kiki', 'ta bouche sens', 'escrot',
        'ton maudia', 'tu es stupide', 'tu es fou', 'anale', 'porno', '',
        'fck', 'fckr', 'fcker', 'fuk', 'fukk', 'fcuk', 'btch', 'bch', 'pipe', 'f*ck','jouir',
        'a**hole', 'f@ck', 'b!tch', 'd!ck', 'trou du cul', 'f***er', 'ass', 'a$$', 'gangband', 'je vais te ban',
        'guay', 'prendre ton cui', 'mougou ton cui', 'zguegue', 'gros seins', 'seins', 'fesses', 'grosse fesse', 
        'elle est bonne', 'espèce de', 'chien vert', 'sand nigger', 'beaner',
        "tu m'énerve", 'nabo', 'nabo clément', 'cumshot', 'djandjou pro max', 'lélé', 'fap', 
        'hentai', 'MILF', 'anal', 'orgasm', 'lesbienne', 'vibrator', 'gangbang', 
        'ahoco', 'porn', 'sex', 'xxx',
        'masturbation', 'franc maçon', 'illuminatie', 'trainnée', 'homo', 'vas chier', 'moche', 'laid',
        'weed', 'crabe', 'macrocéphale', 'nègre', 'raciste', 'sale noir', 'dope', 'brouteur', 'te détruire', 
        'lecher', 'enculé', 'mercon'
    ];

    const messageWords = cleanMessage.split(' ');
    let containsBadWord = false;

    for (const word of messageWords) {
        if (!word || word.length < 2) continue;

        if (badWords.includes(word)) {
            containsBadWord = true;
            break;
        }

        // Multi-words
        for (const badWord of badWords) {
            if (badWord.includes(' ') && cleanMessage.includes(badWord)) {
                containsBadWord = true;
                break;
            }
        }
        if (containsBadWord) break;
    }

    if (!containsBadWord) return;

    // Vérifier si le bot est admin
    let groupMetadata;
    try {
        groupMetadata = await sock.groupMetadata(chatId);
    } catch {
        return;
    }

    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const bot = groupMetadata.participants.find(p => p.id === botId);
    if (!bot?.admin) return;

    // Ne pas punir les admins
    const participant = groupMetadata.participants.find(p => p.id === senderId);
    if (participant?.admin) return;

    // Supprimer le message
    try {
        await sock.sendMessage(chatId, { delete: message.key });
    } catch {
        return;
    }

    // Appliquer l'action
    switch (antiBadwordConfig.action) {
        case 'delete':
            await sock.sendMessage(chatId, {
                text: `⚠️ @${senderId.split('@')[0]} ce langage est interdit ici.`,
                mentions: [senderId]
            }, { quoted: message });
            break;

        case 'kick':
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await sock.sendMessage(chatId, {
                    text: `🚫 @${senderId.split('@')[0]} expulsé (mauvais langage).`,
                    mentions: [senderId]
                }, { quoted: message });
            } catch (error) {
                console.error('Error kicking user:', error);
            }
            break;

        case 'warn':
            try {
                const warningCount = await incrementWarningCount(chatId, senderId);
                if (warningCount >= 3) {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    await resetWarningCount(chatId, senderId);
                    await sock.sendMessage(chatId, {
                        text: `🚫 @${senderId.split('@')[0]} expulsé après *3 avertissements*.`,
                        mentions: [senderId]
                    }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, {
                        text: `⚠️ @${senderId.split('@')[0]} avertissement *${warningCount}/3* (langage interdit).`,
                        mentions: [senderId]
                    }, { quoted: message });
                }
            } catch (error) {
                console.error('Error warning/kicking user:', error);
            }
            break;

        default:
            // fallback
            await sock.sendMessage(chatId, {
                text: `⚠️ @${senderId.split('@')[0]} langage interdit ici.`,
                mentions: [senderId]
            }, { quoted: message });
            break;
    }
}

module.exports = {
    handleAntiBadwordCommand,
    handleBadwordDetection
};
