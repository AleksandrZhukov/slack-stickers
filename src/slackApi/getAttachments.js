const fs = require('fs');
const util = require('util');
const db = require('../db');
const config = require('dotenv').config().parsed;
const md5 = require('md5');
const URL = config.URL;

const readdirAsync = util.promisify(fs.readdir);

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

module.exports = getAttachments;
