const settings = {
  packname: 'ANOS_VOLDIGOAD MINI-MD',
  author: 'GOLDENBOY DEV',
  botName: "ANOS_VOLDIGOAD MINI-MD",
  botOwner: 'GOLDENBOY DEV', // ton nom
  ownerNumber: '50956300796', //Saisissez votre numéro ici, sans le symbole +. Indiquez simplement l'indicatif du pays et le num茅ro, sans espace.
  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: "private",
  maxStoreMessages: 20, 
  storeWriteInterval: 10000,
  description: "Bot WhatsApp Multi-Device pour la gestion de groupes et l'automatisation.",
  version: "3.0.2",
  updateZipUrl: "https://github.com/GoldenBoyRS/Anos_Voldigoad_Mini_MD",
};

module.exports = settings;


// ajoutez votre prefix setting
module.exports.prefix = process.env.PREFIX || '.';

// Anti-mention de masse (suppression auto)
module.exports.antiMention = { enabled: false, threshold: 5, adminBypass: true };
//💻 Mini MD