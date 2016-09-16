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
                url: encodeURI("https://streamlabs.com/api/v1.0/donations?limit=25&currency=USD&access_token=" + options.streamlabs.access_token),
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
            url: encodeURI("https://streamlabs.com/api/v1.0/donations?after=" + lastID + "&currency=USD&access_token=" + options.streamlabs.access_token),
            json: true
        }, (err, res, body) => {
            if (!err && res.statusCode == 200) {
                if (options.status.streamlabs == false) {
                    utils.log('connected to streamlabs');
                    options.status.streamlabs = true;
                    app.io.emit('status', {streamlabs: true});
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
                utils.log('bad response from streamlabs');
                if (options.status.streamlabs == true) {
                    options.status.streamlabs = false;
                    app.io.emit('status', {streamlabs: false});
                }
            }
        });
    }
};
