const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const fs = require('fs');

if (!fs.existsSync('temp')) {
  fs.mkdirSync('temp');
}

const adapter = new FileSync('temp/db.json');

const db = low(adapter);

db.defaults({ userImages: {}, tokens: {} }).write();

module.exports = db;
