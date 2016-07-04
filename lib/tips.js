'use strict';
const utils = require('./utils.js')(),
    request = require('request');

module.exports = function (options, app, mongo) {

    var lastID = "";

    mongo.tips.find({}, (err, results) => {
        if (!err && results.length != 0) {
            lastID = results[results.length - 1]['donation_id'];
            poll();
            setInterval(poll, 15 * 1000);
        } else {
            request.get({
                url: "https://twitchalerts.com/api/v1.0/donations?limit=25&currency=USD&access_token=" + options.twitchalerts.access_token,
                json: true
            }, (err, res, body) => {
                if (!err && res.statusCode == 200) {
                    lastID = body.data[body.data.length - 1]['donation_id'];
                }
                poll();
                setInterval(poll, 15 * 1000);
            });
        }
    });

    //Poll twitch alerts for new tips after the last recorded tip id
    function poll() {
        request.get({
            url: "https://twitchalerts.com/api/v1.0/donations?after=" + lastID + "&currency=USD&access_token=" + options.twitchalerts.access_token,
            json: true
        }, (err, res, body) => {
            if (!err && res.statusCode == 200) {
                if (options.status.twitchalerts == false) {
                    utils.log('connected to twitchalerts');
                    options.status.twitchalerts = true;
                    app.io.emit('status', {twitchalerts: true});
                }
                if (body.data.length == 0) return;
                lastID = body.data[0]['donation_id'];
                let tips = body.data.reverse();
                app.io.emit('tip', tips);
                tips.forEach((tip) => {
                    let entry = new mongo.tips(tip);
                    entry.save();
                });
            } else {
                utils.log('bad response from twitchalerts');
                if (options.status.twitchalerts == true) {
                    options.status.twitchalerts = false;
                    app.io.emit('status', {twitchalerts: false});
                }
            }
        });
    }
};
