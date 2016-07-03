'use strict';
const utils = require('./utils.js')(),
    request = require('request');

module.exports = function (options, app) {

    var lastID = "";

    //Test connection and get last known tip id
    request.get({
        url: "https://twitchalerts.com/api/v1.0/donations?limit=1&currency=USD&access_token=" + options.twitchalerts.access_token,
        json: true
    }, (err, res, body) => {
        if (!err && res.statusCode == 200) {
            utils.log('connected to twitchalerts');
            lastID = body.data[0]['donation_id'];
            options.status.twitchalerts = true;
            //setInterval(poll, 15 * 1000);
        } else {
            utils.log('unable to connect to twitchalerts');
            options.status.twitchalerts = false;
        }
        app.io.emit('status', {twitchalerts: options.status.twitchalerts});
    });

    //Poll twitch alerts for new tips after the last recorded tip id
    function poll() {
        request.get({
            url: "https://twitchalerts.com/api/v1.0/donations?after=" + lastID + "&currency=USD&access_token=" + options.twitchalerts.access_token,
            json: true
        }, (err, res, body) => {
            if (!err && res.statusCode == 200) {
                if (body.data.length == 0) return;
                lastID = body.data[0]['donation_id'];
                app.io.emit('new_tips', body.data);
                if (options.status.twitchalerts = false) {
                    options.status.twitchalerts = true;
                    app.io.emit('status', {twitchalerts: true});
                }
            } else {
                utils.log('unable to get recent tips id from twitchalerts');
                if (options.status.twitchalerts = true) {
                    options.status.twitchalerts = false;
                    app.io.emit('status', {twitchalerts: false});
                }
            }
        });
    }

    //Send last tips to client on connect
    app.io.on('connection', (socket) => {
        request.get({
            url: "https://twitchalerts.com/api/v1.0/donations?limit=25&currency=USD&access_token=" + options.twitchalerts.access_token,
            json: true
        }, (err, res, body) => {
            if (!err && res.statusCode == 200) {
                socket.emit('tips_list', body.data.reverse());
            }
        });
    });
};
