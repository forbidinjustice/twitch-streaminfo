'use strict';
const express = require('express'),
    app = express(),
    path = require('path'),
    utils = require('./utils.js')();

module.exports = function (options, mongo) {

    //Store the number of connected websocket clients
    var connected = 0;

    //Set path for static and rendered files
    app.set('view engine', 'ejs');
    app.set('views', "./lib/html");
    app.use(express.static("./lib/html/assets"));

    //Root route handler
    app.get('/', (req, res, next) => {
        res.render('index', {
            pageTitle: options.page_title,
            botName: options.mod_bot_name
        });
    });

    //Last New Sub route handler
    app.get('/last_new_sub', (req, res, next) => {
        res.sendFile(path.join(__dirname, '/html/last_new_sub.htm'));
    });

    //Start Listening
    var server = app.listen(options.port, () => {
        utils.log("listening on *:" + options.port);
    });

    //Listen for websocket connections
    var io = require('socket.io').listen(server, {});

    //New websocket connection
    io.on('connection', (socket) => {
        connected++;
        utils.log('connection to the websocket (' + connected + ')');
        socket.emit('connected'); //Tell the client we have a good connection
        if (options.status) socket.emit('status', options.status); //Send status to new clients
        mongo.subscribers.find({}, (err, results) => {
            if (!err && results.length != 0) socket.emit('subscribers_list', results.reverse()); //Send list of recent subscribers
        });
        mongo.cheers.find({}, (err, results) => {
            if (!err && results.length != 0) socket.emit('cheers_list', results.reverse()); //Send list of recent cheers
        });
        mongo.lastNewSub.findOne({}, (err, results) => {
            if (!err && results) socket.emit('last_new_sub', results); //Send latest
        });

        //Client disconnected from websocket
        socket.on('disconnect', () => {
            connected--;
            utils.log('disconnection from the websocket (' + connected + ')');
        });
    });

    return {
        io: io
    }
};
