'use strict';
const express = require('express'),
    app = express(),
    path = require('path'),
    utils = require('./utils.js')();

module.exports = function (options) {

    //Set path for static asset files
    app.use(express.static(path.join(__dirname, "html/assets")));

    //Root route handler
    app.get('/', (req, res, next) => {
        res.sendFile(path.join(__dirname, 'html/index.html'));
    });

    //Start Listening
    app.listen(options.port, () => {
        utils.log("listening on *:" + options.port);
    });

    
};
