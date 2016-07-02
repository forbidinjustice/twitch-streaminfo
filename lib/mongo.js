'use strict';
const utils = require('./utils.js')(),
    mongoose = require('mongoose'),
    url = require('url');

module.exports = function (options) {

    //Connect to the mongoDB
    mongoose.connect(options.mongo.uri, (err) => {
        if (err) return utils.log("Error connecting to the mongoDB: " + err.message);
        utils.log("connected to mongoDB: '" + url.parse(options.mongo.uri).pathname.split('/').reverse()[0] + "'");
    });

    //Last Subscribers
    var subscribersSchema = new mongoose.Schema({
        username: String,
        months: Number,
        message: String
    }, {
        capped: {max: 25, size: 1000000}
    });
    var subscribers = mongoose.model('subscribers', subscribersSchema);

    //Last Cheers
    var cheersSchema = new mongoose.Schema({
        username: String,
        months: Number,
        message: String
    }, {
        capped: {max: 25, size: 1000000}
    });
    var cheers = mongoose.model('cheers', cheersSchema);

    //Last New Sub
    var lastNewSubSchema = new mongoose.Schema({
        username: String
    }, {
        capped: {max: 1, size: 1000000}
    });
    var lastNewSub = mongoose.model('last_new_sub', lastNewSubSchema);

    return {
        subscribers: subscribers,
        cheers: cheers,
        lastNewSub: lastNewSub
    }
};
