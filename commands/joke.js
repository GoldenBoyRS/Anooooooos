const jokes = [
    "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tomberaient dans le bateau ! 😂",
    "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël ! 🎄",
    "Qu'est-ce qu'un canif ? Un petit fien ! 🐕",
    "Pourquoi les lions mangent-ils cru ? Parce qu'ils ne savent pas cuisiner ! 🦁",
    "Qu'est-ce qu'un crocodile qui surveille les bagages ? Un Sac-à-dile ! 🐊",
    "Pourquoi les squelettes ne se battent-ils jamais ? Parce qu'ils n'ont pas le cœur à ça ! 💀",
    "Comment appelle-t-on un boomerang qui ne revient pas ? Un bâton ! 🪃",
    "Qu'est-ce qu'un poussin qui sort de sa coquille ? Un œuf décoiffé ! 🐣",
    "Pourquoi le livre de maths est-il triste ? Parce qu'il a trop de problèmes ! 📚",
    "Qu'est-ce qu'un croissant ? Un croissant, c'est pas un décroissant ! 🥐",
    "Pourquoi Peter Pan vole-t-il toujours ? Parce que Tinkerbell coûte trop cher ! ✈️",
    "Comment appelle-t-on un chat tout terrain ? Un 4x4 pattes ! 🐱",
    "Qu'est-ce qu'un canif ? C'est le fils du chien ! 🐶",
    "Pourquoi les robots sont-ils si mauvais en cuisine ? Parce qu'ils font griller les circuits ! 🤖",
    "Qu'est-ce qu'un chien sans pattes ? Une cigarette — parce que tu le poses et tu viens le chercher plus tard ! 🚬",
    "Comment appelle-t-on une ceinture en or ? Une ceinture dorée... qui brille mais qui tient pas le pantalon ! 👖",
    "Pourquoi la mer est-elle salée ? Parce que les poissons n'ont pas de mouchoirs ! 🐟",
    "Qu'est-ce qu'un pingouin au Sahara ? Perdu ! 🐧",
    "Comment appelle-t-on un zombie végétarien ? Un zombie qui mange les vivres ! 🧟",
    "Pourquoi les plantes ne parlent pas ? Parce qu'elles ont la langue dans le pot ! 🌱"
];

async function jokeCommand(sock, chatId, message) {
    try {
        const joke = jokes[Math.floor(Math.random() * jokes.length)];
        await sock.sendMessage(chatId, {
            text: `😂 *Blague du jour :*\n\n${joke}`
        }, { quoted: message });
    } catch (error) {
        console.error('Error in joke command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Impossible de récupérer une blague pour le moment.'
        }, { quoted: message });
    }
}

module.exports = jokeCommand;
