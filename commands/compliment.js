const compliments = [
    "Tu es incroyable tel que tu es.",
"Tu as un super sens de l’humour.",
"Tu es incroyablement attentionné(e) et gentil(le).",
"Tu es plus fort(e) que tu ne le penses.",
"Tu illumines la pièce.",
"Tu es un(e) véritable ami(e).",
"Tu m’inspires.",
"Ta créativité n’a pas de limites.",
"Tu as un cœur en or.",
"Tu fais une différence dans ce monde.",
"Ta positivité est contagieuse.",
"Tu as une éthique de travail impressionnante.",
"Tu fais ressortir le meilleur chez les autres.",
"Ton sourire illumine la journée de tout le monde.",
"Tu es talentueux(se) dans tout ce que tu fais.",
"Ta gentillesse rend le monde meilleur.",
"Tu as une vision unique et magnifique.",
"Ton enthousiasme est vraiment inspirant.",
"Tu es capable d’accomplir de grandes choses.",
"Tu sais toujours comment faire sentir quelqu’un spécial.",
"Ta confiance en toi est admirable.",
"Tu as une belle âme.",
"Ta générosité n’a pas de limites.",
"Tu as un excellent sens du détail.",
"Ta passion est vraiment motivante.",
"Tu es une personne très à l’écoute.",
"Tu es plus fort(e) que tu ne le crois.",
"Ton rire est contagieux.",
"Tu as un don naturel pour faire sentir les autres importants.",
"Tu rends le monde meilleur juste par ta présence.", "J'aime quand tu es dans ton monde coupé du reste du monde 🌃☄️"
];

async function complimentCommand(sock, chatId, message) {
    try {
        if (!message || !chatId) {
            console.log('Invalid message or chatId:', { message, chatId });
            return;
        }

        let userToCompliment;
        
        // Check for mentioned users
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToCompliment = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToCompliment = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToCompliment) {
            await sock.sendMessage(chatId, { 
                text: 'Please mention someone or reply to their message to compliment them!'
            });
            return;
        }

        const compliment = compliments[Math.floor(Math.random() * compliments.length)];

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.sendMessage(chatId, { 
            text: `Hey @${userToCompliment.split('@')[0]}, ${compliment}`,
            mentions: [userToCompliment]
        });
    } catch (error) {
        console.error('Error in compliment command:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: 'Please try again in a few seconds.'
                });
            } catch (retryError) {
                console.error('Error sending retry message:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: 'An error occurred while sending the compliment.'
                });
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }
}

module.exports = { complimentCommand };
