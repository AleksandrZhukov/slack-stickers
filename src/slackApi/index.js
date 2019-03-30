const Router = require('express').Router;
const auth = require('./auth');
const getStickers = require('./getStickers');
const handleBtns = require('./btns');

const SlackApi = Router();

SlackApi.get('/auth', auth);
SlackApi.post('/', getStickers);
SlackApi.post('/btn', handleBtns);

module.exports = SlackApi;
