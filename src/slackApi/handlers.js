const fs = require('fs');
const util = require('util');
const db = require('../db');
const config = require('dotenv').config().parsed;
const md5 = require('md5');
const _ = require('lodash');
const qs = require('qs');
const axios = require('axios');
const URL = config.URL;

const readdirAsync = util.promisify(fs.readdir);

const randomKey = 'XPFG';
const stickersPerPage = 2;
const PRIVATE = 'ephemeral';
const PUBLIC = 'in_channel';

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
        },
        {
          name: 'remove_sticker',
          text: 'Remove',
          type: 'button',
          style: 'danger',
          value: `remove_${f}_page${page}`
        }
      ]
    }))
    .reverse();

  const navigationBtns = [
    page > 0 && {
      name: 'show_page',
      text: 'Prev',
      type: 'button',
      value: page - 1
    },
    userImages.length - ((page + 1) * stickersPerPage) > 0 && {
      name: 'show_page',
      text: 'Next',
      type: 'button',
      value: page + 1
    },
    {
      name: 'cancel',
      text: 'Cancel',
      type: 'button',
      style: 'danger'
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
      response_type: PRIVATE,
      text: 'You are registered, now you can send stickers'
    });
  }

  const attachments = await getAttachments(userId);

  res.json({
    response_type: PRIVATE,
    text: 'Select sticker',
    attachments
  });
};

const sendSticker = (payload, res) => {
  const value = payload.actions[0].value;
  const userName = payload.user.name;

  return res.json({
    delete_original: true,
    replace_original: false,
    response_type: PUBLIC,
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

const removeSticker = async (payload, res) => {
  const value = payload.actions[0].value;
  const userId = payload.user.id;

  const [_, attachmentId, page] = value.match(/remove_(.+).png_page(\d)/);
  const token = db.get(`tokens.${md5(userId)}`).value();
  db.get(`userImages.${token}`).pull(attachmentId).write();

  const attachments = await getAttachments(userId, +page);

  return res.json({
    replace_original: true,
    response_type: PRIVATE,
    text: 'Select sticker',
    attachments
  });
};

const cancelRequest = (res) => res.json({ delete_original: true });

const showStickersPage = async (payload, res) => {
  const userId = payload.user.id;
  const value = payload.actions[0].value;
  const attachments = await getAttachments(userId, +value);

  return res.json({
    replace_original: true,
    response_type: PRIVATE,
    text: 'Select sticker',
    attachments
  });
};

const handleBtn = async function(req, res, next) {
  const payload = JSON.parse(req.body.payload);
  const actionName = payload.actions[0].name;

  switch (actionName) {
    case 'send_sticker': return sendSticker(payload, res);
    case 'show_page': return showStickersPage(payload, res);
    case 'remove_sticker': return removeSticker(payload, res);
    case 'cancel': return cancelRequest(res);
  }
};

const auth = async function(req, res) {
  if (!req.query.code) {
    return res.redirect('/?error=access_denied');
  }

  const authInfo = {
    client_id: config.SLACK_CLIENT_ID,
    client_secret: config.SLACK_CLIENT_SECRET,
    code: req.query.code,
    single_channel: false
  };

  const result = await axios.post('https://slack.com/api/oauth.access', qs.stringify(authInfo))
    .catch((err) => { console.error(err); });

  const { team_id, error } = result.data;

  if (error) {
    res.sendStatus(401);
    console.log(error);
    return;
  }
  res.redirect(`slack://open?team=${team_id}`);
};

module.exports = {
  getStickers,
  handleBtn,
  auth
};
