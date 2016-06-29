'use strict';
const express = require('express'),
    app = express(),
    path = require('path'),
    utils = require('./utils.js')();

module.exports = function (options) {

    //Store the number of connected websocket clients
    var connected = 0;

    //Set path for static asset files
    app.use(express.static(path.join(__dirname, "html/assets")));

    //Root route handler
    app.get('/', (req, res, next) => {
        res.sendFile(path.join(__dirname, 'html/index.html'));
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
        if (options.twitch.status) io.emit('status', options.twitch.status); //Send twitch status to new client

        //Client disconnected from websocket
        socket.on('disconnect', () => {
            connected--;
            utils.log('disconnection from the websocket (' + connected + ')');
        });
    });

    //Method to send a websocket message to all clients
    function emit(id, data) {
        io.emit(id, data);
    }

    return {
        emit: emit
    }
};
