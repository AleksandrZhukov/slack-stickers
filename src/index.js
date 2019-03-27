const express = require('express');
const bodyParser = require('body-parser');
const slackApi = require('./slackApi');
require('./telegramApi');

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

app.use('/slack', slackApi);

app.use(express.static('temp'));

const server = app.listen(process.env.PORT || 3003, () => {
  console.log(
    'Express server listening on port %d in %s mode',
    server.address().port,
    app.settings.env
  );
});
