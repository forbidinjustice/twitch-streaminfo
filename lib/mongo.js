'use strict';
const utils = require('./utils.js')(),
    mongoose = require('mongoose'),
    url = require('url');

module.exports = function (options) {

    mongoose.connect(options.mongo.uri, (err) => {
        if (err) return utils.log("Error connecting to the mongoDB: " + err.message);
        utils.log("connected to mongoDB: '" + url.parse(options.mongo.uri).pathname.split('/').reverse()[0] + "'");
    });

    var subscribersSchema = new mongoose.Schema({
        username: String,
        months: Number,
        message: String
    }, {
        capped: {max: 5, size: 1000000}
    });
    var subscribers = mongoose.model('subscribers', subscribersSchema);

    var cheersSchema = new mongoose.Schema({
        username: String,
        months: Number,
        message: String
    }, {
        capped: {max: 5, size: 1000000}
    });
    var cheers = mongoose.model('cheers', cheersSchema);

    return {
        subscribers: subscribers,
        cheers: cheers
    }
};
