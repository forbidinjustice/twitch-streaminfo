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
    
    //Last Tips
    var tipsSchema = new mongoose.Schema({
        amount: String,
        'created_at': String,
        'donation_id': String,
        email: String,
        message: String,
        name: String
    }, {
        collection: "tips",
        capped: {max: 25, size: 1000000}
    });
    var tips = mongoose.model('tips', tipsSchema);
    
    //Last Subscribers
    var subscribersSchema = new mongoose.Schema({
        username: String,
        months: Number,
        message: String,
        date: Date
    }, {
        collection: "subscribers",
        capped: {max: 25, size: 1000000}
    });
    var subscribers = mongoose.model('subscribers', subscribersSchema);

    //Last Cheers
    var cheersSchema = new mongoose.Schema({
        username: String,
        bits: Number,
        message: String,
        date: Date
    }, {
        collection: "cheers",
        capped: {max: 25, size: 1000000}
    });
    var cheers = mongoose.model('cheers', cheersSchema);

    //Last New Sub
    var lastNewSubSchema = new mongoose.Schema({
        username: String
    }, {
        collection: "last_new_sub",
        capped: {max: 1, size: 1000000}
    });
    var lastNewSub = mongoose.model('last_new_sub', lastNewSubSchema);

    //Queue Lists
    var queuesSchema = new mongoose.Schema({
        queue: String,
        normalized: String,
        modified: Date,
        names: [String]
    }, {
        collection: "queues"
    });
    var queues = mongoose.model('queues', queuesSchema);

    return {
        subscribers: subscribers,
        cheers: cheers,
        lastNewSub: lastNewSub,
        queues: queues,
        tips: tips
    }
};
