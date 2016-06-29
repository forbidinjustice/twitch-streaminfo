'use strict';
const express = require('express'),
    app = express(),
    path = require('path');

module.exports = function (options) {

    app.use(express.static(path.join(__dirname, "html/assets")));

    app.get('/', (req, res, next) => {
        res.sendFile(path.join(__dirname, 'html/index.html'));
    });

    app.listen(options.port, () => {
        console.log("listening on *:" + options.port);
    });

};
