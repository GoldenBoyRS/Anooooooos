const { addWelcome, delWelcome, isWelcomeOn, addGoodbye, delGoodBye, isGoodByeOn } = require('../lib/index');


// ✅ Générateur automatique du message
function buildAutoWelcomeTemplate(customTopText = "") {

  const top = customTopText ? `${customTopText}\n\n` : "";

  return (
    top +
    "╭━━━〔 🎉 BIENVENUE(E) 〕━━━╮\n" +
    "┃ 👤 Nouveau : {user}\n" +
    "┃ 👥 Membres : {count}\n" +
    "┃ 🏷️ Groupe : {group}\n" +
    "╰━━━━━━━━━━━━━━━━━━━━╯\n\n" +
    "📑 Description :\n{description}\n\n" +
    "ANOS_VOLDIGOAD MINI-MD\n" +
    "> GOLDENBOY DEV"
  );
}


async function handleWelcome(sock, chatId, message, match) {

  if (!match) {
    return sock.sendMessage(chatId, {
      text:
`╭──❏ 🎉 WELCOME
│
│ ✅ .welcome on
│ ✍️ .welcome Salut
│ 🛠️ .welcome set Salut
│ 🚫 .welcome off
│
│ (Infos auto activées)
╰──❏`,
      quoted: message
    });
  }

  const raw = match.trim();
  const parts = raw.split(' ');
  const command = (parts[0] || '').toLowerCase();
  const rest = parts.slice(1).join(' ').trim();

  const known = ['on', 'off', 'set'].includes(command);

  const action = known ? command : 'set';
  const customText = known ? rest : raw;


  // ✅ ACTIVER
  if (action === 'on') {

    if (await isWelcomeOn(chatId)) {
      return sock.sendMessage(chatId, {
        text: '⚠️ La commande `welcome` est déjà activée.',
        quoted: message
      });
    }

    await addWelcome(chatId, true, buildAutoWelcomeTemplate());

    return sock.sendMessage(chatId, {
      text: '✅ La commande `welcome` activé avec automatisation des messages.',
      quoted: message
    });
  }


  // ✅ DÉSACTIVER
  if (action === 'off') {

    if (!(await isWelcomeOn(chatId))) {
      return sock.sendMessage(chatId, {
        text: '⚠️ La commande `welcome` est déjà désactivée.',
        quoted: message
      });
    }

    await delWelcome(chatId);

    return sock.sendMessage(chatId, {
      text: '✅ Welcome désactivé.',
      quoted: message
    });
  }


  // ✅ PERSONNALISER
  if (action === 'set') {

    if (!customText) {
      return sock.sendMessage(chatId, {
        text: '⚠️ Exemple : .welcome Salut, bienvenue.',
        quoted: message
      });
    }

    await addWelcome(chatId, true, buildAutoWelcomeTemplate(customText));

    return sock.sendMessage(chatId, {
      text: '✅ Votre Message est enregistré avec infos automatiques.',
      quoted: message
    });
  }


  return sock.sendMessage(chatId, {
    text: '❌ Commande invalide.',
    quoted: message
  });
}



// ================= GOODBYE ==================


function buildAutoGoodbyeTemplate(customTopText = "") {

  const top = customTopText ? `${customTopText}\n\n` : "";

  return (
    top +
    "👋 {user} a quitté {group}\n\n" +
    "ANOS_VOLDIGOAD MINI-MD\n" +
    "> BY GOLDENBOY DEV"
  );
}


async function handleGoodbye(sock, chatId, message, match) {

  if (!match) {
    return sock.sendMessage(chatId, {
      text:
`╭──❏ 👋 GOODBYE
│
│ ✅ .goodbye on
│ ✍️ .goodbye Bye
│ 🚫 .goodbye off
╰──❏`,
      quoted: message
    });
  }

  const raw = match.trim();
  const parts = raw.split(' ');
  const command = (parts[0] || '').toLowerCase();
  const rest = parts.slice(1).join(' ').trim();

  const known = ['on', 'off', 'set'].includes(command);

  const action = known ? command : 'set';
  const customText = known ? rest : raw;


  // ✅ ON
  if (action === 'on') {

    if (await isGoodByeOn(chatId)) {
      return sock.sendMessage(chatId, {
        text: '⚠️ La commande `Goodbye` déjà activée.',
        quoted: message
      });
    }

    await addGoodbye(chatId, true, buildAutoGoodbyeTemplate());

    return sock.sendMessage(chatId, {
      text: '✅ La commande`Goodbye` activé.',
      quoted: message
    });
  }


  // ✅ OFF
  if (action === 'off') {

    if (!(await isGoodByeOn(chatId))) {
      return sock.sendMessage(chatId, {
        text: '⚠️ La commande `Goodbye` déjà désactivée.',
        quoted: message
      });
    }

    await delGoodBye(chatId);

    return sock.sendMessage(chatId, {
      text: '✅ La commande `Goodbye` désactivée.',
      quoted: message
    });
  }


  // ✅ SET
  if (action === 'set') {

    if (!customText) {
      return sock.sendMessage(chatId, {
        text: '⚠️ Exemple : .goodbye Bye',
        quoted: message
      });
    }

    await addGoodbye(chatId, true, buildAutoGoodbyeTemplate(customText));

    return sock.sendMessage(chatId, {
      text: '✅ Votre Message `goodbye` est enregistré.',
      quoted: message
    });
  }


  return sock.sendMessage(chatId, {
    text: '❌ Commande invalide.',
    quoted: message
  });
}


module.exports = {
  handleWelcome,
  handleGoodbye
};