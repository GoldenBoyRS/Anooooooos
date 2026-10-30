const insults = [
    "T'as le QI d'une huître et le charisme d'une serpillière mouillée. 😂",
    "Si les bêtises étaient des étoiles, tu serais une galaxie entière ! 🌌",
    "Tu es la preuve vivante que l'évolution peut aussi reculer. 🦧",
    "J'ai vu des cactus plus chaleureux que toi. 🌵",
    "Tu es aussi utile qu'un essuie-glace sur une Bugatti sous-marine. 🚗💦",
    "Ton cerveau a autant de neurones qu'une plante en plastique. 🪴",
    "Tu es si lent que tu pourrais rater un enterrement en express. 🐢",
    "Même Google ne pourrait pas trouver ta classe. 🔍",
    "Tu es le genre de personne qui met du ketchup sur du ketchup. 🍅",
    "Si la stupidité était un sport olympique, tu aurais déjà toutes les médailles. 🏅",
    "Tu es si ennuyeux que même ton écho te raccroche au nez. 📞",
    "Tu as autant de personnalité qu'un mur blanc. 🧱",
    "Si t'étais une blague, même les comédiens se refuseraient à la raconter. 😐",
    "Tu dois vraiment travailler dur pour être aussi inutile. 💪",
    "La chance a décidé de prendre des vacances le jour de ta naissance. 🏖️"
];

async function insultCommand(sock, chatId, message) {
    try {
        // Get mentioned user or replied user
        let target = null;
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        const quoted = message.message?.extendedTextMessage?.contextInfo?.participant;

        if (mentioned && mentioned.length > 0) {
            target = mentioned[0];
        } else if (quoted) {
            target = quoted;
        }

        const insult = insults[Math.floor(Math.random() * insults.length)];

        if (target) {
            await sock.sendMessage(chatId, {
                text: `@${target.split('@')[0]} : ${insult}`,
                mentions: [target]
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: insult
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in insult command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Une erreur est survenue.'
        }, { quoted: message });
    }
}

module.exports = { insultCommand };
