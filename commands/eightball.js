const eightBallResponses = [
    "Oui, absolument!",
    "Y'a pas moyen!",
    "Réessayez plus tard.",
    "C'est incertain.",
    "Très douteux.",
    "Sans aucun doute.",
    "Ma réponse est non.",
    "Tout porte à croire que oui.."
];

async function eightBallCommand(sock, chatId, question) {
    if (!question) {
        await sock.sendMessage(chatId, { text: 'Please ask a question!' });
        return;
    }

    const randomResponse = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    await sock.sendMessage(chatId, { text: `🎱 ${randomResponse}` });
}

module.exports = { eightBallCommand };
