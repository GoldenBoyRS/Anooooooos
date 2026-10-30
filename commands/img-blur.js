const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function blurCommand(sock, chatId, message, quotedMsg) {
    try {
        // Get the image from quoted message or current message
        let imageMsg = quotedMsg
            || message.message?.imageMessage
            || message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

        if (!imageMsg) {
            await sock.sendMessage(chatId, {
                text: '❌ Réponds à une image avec *.blur* pour la flouter.'
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            react: { text: '🔄', key: message.key }
        }).catch(() => {});

        // Download the image
        const stream = await sock.downloadContentFromMessage(imageMsg, 'image');
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Apply blur using sharp
        const blurred = await sharp(buffer)
            .blur(15)
            .toBuffer();

        await sock.sendMessage(chatId, {
            image: blurred,
            caption: '🌫️ Image floutée !'
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (error) {
        console.error('Error in blur command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Impossible de flouter l\'image. Réessaie.'
        }, { quoted: message }).catch(() => {});
    }
}

module.exports = blurCommand;
