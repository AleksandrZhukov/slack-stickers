const TelegramBot = require('node-telegram-bot-api');
const config = require('dotenv').config().parsed;
const axios = require('axios');
const sharp = require('sharp');
const md5 = require('md5');
const uniq = require('lodash/uniq');
const fs = require('fs');
const https = require('https');
const { convertFile } = require('tgs-to-gif');

if (!fs.existsSync('temp/images')) {
  fs.mkdirSync('temp/images');
}

const token = config.TELEGRAM_BOT_TOKEN;
const db = require('../db');

const bot = new TelegramBot(token, { polling: true });

const sendMessage = (chatId, message) => bot.sendMessage(chatId, message, { parse_mode: 'markdown' });

const getSticker = async fileId => {
  const sticker = await axios(
    `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
  );

  return `https://api.telegram.org/file/bot${token}/${
    sticker.data.result.file_path
  }`;
};

const saveStickerFile = async (userId, uniqFileId, msg) => {
  const fileId = msg.sticker.file_id;
  const image = await getSticker(fileId);

  if (msg.sticker.is_animated) {
    const mes = await sendMessage(msg.chat.id, 'Start generating Gif...');

    const animatedFile = fs.createWriteStream(`temp/images/${fileId}.tgs`);
    await new Promise((resolve, reject) => https.get(image, function(response) {
      response.pipe(animatedFile).on('finish', (err) => {
        err ? reject(err) : resolve();
      });
    }));

    await convertFile(animatedFile.path, { output: `temp/images/${uniqFileId}.gif`, width: 150 });
    bot.editMessageText('Gif generated', { chat_id: msg.chat.id, message_id: mes.message_id });

  } else {
    const res = await axios(image, { responseType: 'arraybuffer' });
    await new Promise((resolve, reject) => sharp(res.data).resize({ width: 150 }).toFile(`temp/images/${uniqFileId}.png`, (err) => {
      if (err) reject(err);
      resolve();
    }));
  }
};

const saveSticker = async msg => {
  const userId = msg.from.id;
  const uniqFileId = msg.sticker.file_unique_id;

  try {
    const files = await fs.promises.readdir('temp/images/');
    if (!Array.from(files).some(f => f.startsWith(uniqFileId))) {
      await saveStickerFile(userId, uniqFileId, msg);
    }

    db.get('userImages').updateWith(md5(userId), (a = []) => uniq([uniqFileId, ...a])).write();
  } catch (err) {
    sendMessage(msg.chat.id, 'Sorry, something went wrong. \nPlease report this issue to @alexZhukov.');
    console.error(err);
  }
};

bot.on('message', msg => {
  const chatId = msg.chat.id;
  if (msg.text === '/help') {
    return sendMessage(chatId, `This bot assist you to send stickers to your slack. \nPlease type \`/\start\` and follow instructions.`);
  }
  if (msg.text === '/start') {
    return sendMessage(chatId, `Please send this to slack: \n \`/ss XPFG${md5(msg.from.id)}\`. \n\nNow you can send stickers!`);
  }
  if (msg && msg.sticker && msg.sticker.file_id) {
    return saveSticker(msg);
  }
});
