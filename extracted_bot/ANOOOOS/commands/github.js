const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');


async function githubCommand(sock, chatId, message) {
  try {
    const res = await fetch('https://api.github.com/repos/💻 𝗦𝗠𝗗/𝗦𝗨𝗞𝗨𝗡𝗔 𝗫𝗗');
    if (!res.ok) throw new Error('Error fetching repository data');
    const json = await res.json();

    let txt = `*.𖥔  𝚈𝚄𝙽𝙰  .𖥔*\n\n`;
    txt += `.𖥔  *Name* : ${json.name}\n`;
    txt += `.𖥔  *Watchers* : ${json.watchers_count}\n`;
    txt += `.𖥔  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
    txt += `.𖥔  *Last Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
    txt += `.𖥔  *URL* : ${json.html_url}\n`;
    txt += `.𖥔  *Forks* : ${json.forks_count}\n`;
    txt += `.𖥔  *Stars* : ${json.stargazers_count}\n\n`;
    txt += `.𖥔 *𝚈𝚄𝙽𝙰*`;

    // Use the local asset image
    const imgPath = path.join(__dirname, '../assets/bot_image.jpg');
    const imgBuffer = fs.readFileSync(imgPath);

    await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });
  } catch (error) {
    await sock.sendMessage(chatId, { text: '❌ Error fetching repository information.' }, { quoted: message });
  }
}

module.exports = githubCommand; 
