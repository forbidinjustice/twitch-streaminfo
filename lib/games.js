'use strict';
const config = require('../config');
const fs = require('fs');
const path = require('path');
const logger = require('winston');
const myEvents = require('./events');

const nonGames = [
  'Gaming Talk Shows',
  'Creative',
  'Social Eating',
];

const gamesFile = path.join(__dirname, 'games.json');
let games = [];

if (fs.existsSync(gamesFile)) {
  games = require(gamesFile);
}

module.exports = function Games(app) {
  app.app.get('/games', (req, res) => {
    logger.info(`Request: ${req.url}`);
    if (games.length > 0) {
      res.send(`The last played games are: ${games.join(' | ')}`);
    } else {
      res.send('No games have been saved.');
    }
  });
};

myEvents.on('add_game', game => {
  if (!game) {
    return;
  }
  // Don't record 'non-games'
  if (nonGames.indexOf(game) !== -1) {
    return;
  }
  const i = games.indexOf(game);
  // Game in pos 0 already
  if (i === 0) {
    return;
  }
  // Game in list already, remove it
  if (i !== -1) {
    games.splice(i, 1);
  }
  // Put game at beginning of list
  games.splice(0, 0, game);
  // Trim list if too long
  if (games.length > config.games.count) {
    games = games.slice(0, config.games.count);
  }
  fs.writeFile(gamesFile, JSON.stringify(games, null, 2));
});
