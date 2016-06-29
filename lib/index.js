'use strict';
var server = require('./server.js');

module.exports = function (options) {
    server = server(options);
};
