const TelegramBot = require('node-telegram-bot-api');
const config = require('dotenv').config().parsed;
const axios = require('axios');
const sharp = require('sharp');
const token = config.TELEGRAM_BOT_TOKEN;
const md5 = require('md5');
const _ = require('lodash');

const db = require('../db');

const bot = new TelegramBot(token, { polling: true });

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

  const image = await getSticker(fileId);
  const res = await axios(image, { responseType: 'arraybuffer' });

  sharp(res.data).resize({ width: 150 }).toFile(`temp/images/${fileId}.png`, (err) => {
    if (!err) {
      db.get('userImages').updateWith(md5(userId), (a = []) => _.uniq([fileId, ...a])).write();
    }
  });
};

bot.on('message', async msg => {
  if (msg.text === '/start') {
    return bot.sendMessage(msg.chat.id, `Pls send this to slack: \n \`/ts XPFG${md5(msg.from.id)}\``, { parse_mode: 'markdown' });
  }
  if (msg && msg.sticker && msg.sticker.file_id) {
    await saveSticker(msg);
  }
});
