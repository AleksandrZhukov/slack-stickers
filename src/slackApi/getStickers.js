const db = require('../db');
const md5 = require('md5');
const getAttachments = require('./getAttachments');

const RANDOM_KEY = 'XPFG';
const PRIVATE = 'ephemeral';

const getStickers = async function(req, res) {
  const userId = req.body.user_id;

  if (~req.body.text.search(RANDOM_KEY)) {
    const token = req.body.text.replace(/(^XPFG|\s)/g, '');
    db.update('tokens', tokens => ({ ...tokens, [md5(userId)]: token })).write();
    return res.json({
      response_type: 'ephemeral',
      text: 'You are registered, now you can send stickers.'
    });
  }

  const userExists = db.has(`tokens.${md5(userId)}`).value();

  if (!userExists) {
    return res.json({
      response_type: PRIVATE,
      text: 'Seems you are not registered. Please type `\\start` in `\@slack_stickers_bot` in telegram.'
    });
  }

  const token = db.get(`tokens.${md5(userId)}`).value();
  const hasImages = db.get(`userImages.${token}`).size().value() > 0;

  if (!hasImages) {
    return res.json({
      response_type: PRIVATE,
      text: 'Currently you don\'t have available stickers. Please send some sticker to `\@slack_stickers_bot` in telegram and try one more time.'
    });
  }

  const attachments = await getAttachments(userId);

  res.json({
    response_type: PRIVATE,
    text: 'Select sticker',
    attachments
  });
};

module.exports = getStickers;
