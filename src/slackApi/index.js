const Router = require('express').Router;
const handlers = require('./handlers');

const SlackApi = Router();

SlackApi.post('/', handlers.getStickers);
SlackApi.post('/btn', handlers.handleBtn);

module.exports = SlackApi;
