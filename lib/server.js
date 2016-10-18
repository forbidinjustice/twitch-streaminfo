'use strict';
const config = require('../config');
const express = require('express');
const app = express();
const path = require('path');
const logger = require('winston');

module.exports = function Server(mongo) {
  // Store the number of connected websocket clients
  let connected = 0;

  // Set path for static and rendered files
  app.set('view engine', 'ejs');
  app.set('views', './html/views');
  app.use(express.static('./html/static'));


  // Root route handler
  app.get('/', (req, res) => {
    res.render('index', {
      pageTitle: config.pageTitle,
      botName: config.modBotName,
    });
  });

  // Last New Sub route handler
  app.get('/lastnewsub', (req, res) => {
    res.sendFile(path.join(__dirname, '../html/views/lastnewsub.htm'));
  });
  
  // Start Listening
  const server = app.listen(config.port, () => {
    logger.info(`listening on *:${config.port}`);
  });

  // Listen for websocket connections
  const io = require('socket.io').listen(server, {});

  // New websocket connection
  io.on('connection', (socket) => {
    connected++;
    logger.info(`connection to the websocket (${connected})`);
    // socket.emit('connected');
    // Send status to new clients
    if (config.status) {
      socket.emit('status', config.status);
    }
    // Send Twitch status to new clients
    if (config.twitch.status) {
      socket.emit('twitch_status', config.twitch.status);
    }

    // Send list of recent tips
    mongo.tips.find({}, (err, results) => {
      if (!err && results.length !== 0) {
        socket.emit('tips_list', results);
      }
    });

    // Send list of recent subscribers
    mongo.subscribers.find({}, (err, results) => {
      if (!err && results.length !== 0) {
        socket.emit('subscribers_list', results);
      }
    });

    // Send list of game queues
    mongo.queues.find({}).sort({ modified: -1 }).exec((err, results) => {
      if (!err && results.length !== 0) {
        socket.emit('queues_list', results);
      }
    });

    // Send list of recent cheers
    socket.on('get_cheers_list', () => {
      mongo.cheers.find({}, (err, results) => {
        if (!err && results.length !== 0) {
          socket.emit('cheers_list', results);
        }
      });
    });

    // Client disconnected from websocket
    socket.on('disconnect', () => {
      connected--;
      logger.info(`disconnection from the websocket (${connected})`);
    });
	
	socket.on('get_last_new_sub', () => {
		// Send latest
		mongo.lastNewSub.findOne({}, (err, results) => {
			if (!err && results) {
				socket.emit('last_new_sub', results);
			}
		});
	});
  });

  return {
    app,
    io,
  };
};
