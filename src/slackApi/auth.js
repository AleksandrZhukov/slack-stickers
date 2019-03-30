const config = require('dotenv').config().parsed;
const qs = require('qs');
const axios = require('axios');

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

module.exports = auth;
