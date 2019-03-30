const TelegramBot = require('node-telegram-bot-api');
const config = require('dotenv').config().parsed;
const axios = require('axios');
const sharp = require('sharp');
const md5 = require('md5');
const uniq = require('lodash/uniq');

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

const saveSticker = async msg => {
  const userId = msg.from.id;
  const fileId = msg.sticker.file_id;

  try {
    const image = await getSticker(fileId);
    const res = await axios(image, { responseType: 'arraybuffer' });
    sharp(res.data).resize({ width: 150 }).toFile(`temp/images/${fileId}.png`, (err) => {
      if (!err) {
        db.get('userImages').updateWith(md5(userId), (a = []) => uniq([fileId, ...a])).write();
      } else {
        throw err;
      }
    });
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
