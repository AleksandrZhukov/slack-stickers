const Router = require('express').Router;
const handlers = require('./handlers');

const SlackApi = Router();

SlackApi.get('/auth', handlers.auth);
SlackApi.post('/', handlers.getStickers);
SlackApi.post('/btn', handlers.handleBtn);

module.exports = SlackApi;
