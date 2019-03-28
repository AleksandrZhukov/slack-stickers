const fs = require('fs');
const util = require('util');
const db = require('../db');
const config = require('dotenv').config().parsed;
const md5 = require('md5');
const URL = config.URL;

const readdirAsync = util.promisify(fs.readdir);

const randomKey = 'XPFG';
const stickersPerPage = 2;

const getAttachments = async (userId, page = 0) => {
  const token = db.get(`tokens.${md5(userId)}`).value();

  const userImages = db.get(`userImages.${token}`).value();
  const pageImages = userImages.slice(stickersPerPage * page, stickersPerPage * (page + 1));

  const files = await readdirAsync('temp/images');

  const attachments = files
    .filter(f => f.includes('.png') && pageImages.includes(f.replace('.png', '')))
    .map(f => ({
      title: 'Sticker',
      image_url: `${URL}images/${f}`,
      callback_id: 'send_sticker',
      actions: [
        {
          name: 'send_sticker',
          text: 'Select',
          type: 'button',
          value: f
        }
      ]
    }))
    .reverse();

  const navigationBtns = [
    page > 0 && {
      name: 'send_sticker',
      text: 'Prev',
      type: 'button',
      value: `nextPage_${page - 1}`
    },
    userImages.length - ((page + 1) * stickersPerPage) > 0 && {
      name: 'send_sticker',
      text: 'Next',
      type: 'button',
      value: `nextPage_${page + 1}`
    },
    {
      name: 'send_sticker',
      text: 'Cancel',
      type: 'button',
      style: 'danger',
      value: 'cancel'
    }
  ];

  attachments.push({
    callback_id: 'send_sticker',
    title: '',
    actions: navigationBtns.filter(Boolean)
  });

  return attachments;
};

const getStickers = async function(req, res, next) {
  const userId = req.body.user_id;

  if (~req.body.text.search(randomKey)) {
    const token = req.body.text.replace(/(^XPFG|\s)/g, '');
    db.update('tokens', tokens => ({ ...tokens, [md5(userId)]: token })).write();
    return res.json({
      response_type: 'ephemeral', // private message
      text: 'You are registered, now you can send stickers'
    });
  }

  const attachments = await getAttachments(userId);

  res.json({
    response_type: 'ephemeral', // private message
    text: 'Select sticker',
    attachments
  });
};

const handleBtn = async function(req, res, next) {
  const payload = JSON.parse(req.body.payload);
  const value = payload.actions[0].value;
  const userId = payload.user.id;
  const userName = payload.user.name;

  if (value === 'cancel') {
    return res.json({ delete_original: true });
  }
  if (value.includes('nextPage_')) {
    const attachments = await getAttachments(
      userId,
      +value.replace('nextPage_', '')
    );

    return res.json({
      replace_original: true,
      response_type: 'ephemeral', // private message
      text: 'Select sticker',
      attachments
    });
  }
  res.json({
    delete_original: true,
    replace_original: false,
    response_type: 'in_channel', // public to the channel
    attachments: [
      {
        color: '#7CD197',
        author_name: `<@${userName}> posted`,
        title: '',
        image_url: `${URL}images/${value}`
      }
    ]
  });
};

module.exports = {
  getStickers,
  handleBtn
};
