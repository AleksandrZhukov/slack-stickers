const db = require('../db');
const config = require('dotenv').config().parsed;
const md5 = require('md5');
const getAttachments = require('./getAttachments');
const URL = config.URL;

const PUBLIC = 'in_channel';
const PRIVATE = 'ephemeral';

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

const cancelRequest = (res) => res.json({ delete_original: true });

const handleBtns = async function(req, res) {
  const payload = JSON.parse(req.body.payload);
  const actionName = payload.actions[0].name;

  switch (actionName) {
    case 'send_sticker': return sendSticker(payload, res);
    case 'show_page': return showStickersPage(payload, res);
    case 'remove_sticker': return removeSticker(payload, res);
    case 'cancel': return cancelRequest(res);
  }
};

module.exports = handleBtns;
