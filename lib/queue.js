'use strict';
const utils = require('./utils.js')(),
    moment = require('moment');

module.exports = function (options, app, mongo, twitch) {

    //Queues list route handler
    app.app.get("/queues/list", (req, res, next) => {
        mongo.queues.find({}, (err, results) => {
            if (err) {
                utils.log("db error: /queues/list: " + JSON.stringify(err));
                return res.send("Database Error");
            }
            res.send(results);
        });
    });

    //Queues route handler
    app.app.get('/queues', (req, res, next) => {
        if (req.query['q'] == null || req.query['q'] == "none") {
            res.send(showBaseCommands());
            return;
        }
        let query = req.query['q'].split(" ");
        let action = query.shift();
        switch (action) {
            case "c":
            case "create":
                createQueue(action, query, (r) => {
                    res.send(r);
                });
                break;
            case "d":
            case "delete":
                deleteQueue(action, query, (r) => {
                    res.send(r);
                });
                break;
            case "l":
            case "list":
                listQueues((r) => {
                    res.send(r);
                });
                break;
            case "a":
            case "add":
                addUser(action, query, (r) => {
                    res.send(r);
                });
                break;
            case "r":
            case "remove":
                removeUser(action, query, (r) => {
                    res.send(r);
                });
                break;
            case "b":
            case "bump":
                bumpUser(action, query, (r) => {
                    res.send(r);
                });
                break;
            case "f":
            case "find":
                findUser(action, query, (r) => {
                    res.send(r);
                });
                break;
            case "n":
            case "next":
                nextList(action, query, (r) => {
                    res.send(r);
                });
                break;
            default:
                res.send(showBaseCommands());
        }
    });

    function showBaseCommands() {
        return "Usage: !q [ add | remove | next | bump | find | create | delete | list ]";
    }

    function createQueue(action, query, callback) {
        if (!query[0]) return callback("Usage: !q " + action + " &lt;name&gt;");
        let queue = new RegExp("^" + query[0] + "$", 'i');
        mongo.queues.findOne({queue: queue}, (err, result) => {
            if (err) {
                utils.log("db error: find createQueue: " + JSON.stringify(err));
                return callback("Database Error");
            }
            if (result) return callback("The queue '" + result.queue + "' already exists.");
            let data = {
                queue: query[0],
                normalized: query[0].toLowerCase(),
                modified: moment(),
                names: []
            };
            let entry = new mongo.queues(data);
            entry.save((err) => {
                if (err) {
                    utils.log("db error: save createQueue: " + JSON.stringify(err));
                    return callback("Database Error");
                }
                emitQueues();
                return callback("The queue '" + query[0] + "' has been created.");
            });
        });
    }

    function deleteQueue(action, query, callback) {
        if (!query[0]) return callback("Usage: !q " + action + " &lt;name&gt;");
        let queue = new RegExp("^" + query[0] + "$", 'i');
        mongo.queues.findOne({queue: queue}, (err, result) => {
            if (err) {
                utils.log("db error: find deleteQueue: " + JSON.stringify(err));
                return callback("Database Error");
            }
            if (!result) return callback("The queue '" + query[0] + "' does not exist.");
            mongo.queues.remove({_id: result._id}, (err) => {
                if (err) {
                    utils.log("db error: save deleteQueue: " + JSON.stringify(err));
                    return callback("Database Error");
                }
                emitQueues();
                return callback("The queue '" + result.queue + "' has been deleted.");
            });
        });
    }

    function listQueues(callback) {
        mongo.queues.find({}).sort({normalized: 1}).exec((err, results) => {
            if (err) {
                utils.log("db error: find listQueues: " + JSON.stringify(err));
                return callback("Database Error");
            }
            if (results.length == 0) return callback("There are not any queues to list.");
            let str = "Queues - ";
            for (let i = 0; i < results.length; i++) {
                str += results[i].queue + " (" + results[i].names.length + ")";
                if (i < results.length - 1) str += " | ";
            }
            return callback(str);
        });
    }

    function addUser(action, query, callback) {
        if (!query[0] || !query[1]) return callback("Usage: !q " + action + " &lt;queue&gt; &lt;name&gt;");
        let queue = new RegExp("^" + query[0] + "$", 'i');
        mongo.queues.findOne({queue: queue}, (err, result) => {
            if (err) {
                utils.log("db error: find addUser: " + JSON.stringify(err));
                return callback("Database Error");
            }
            if (!result) return callback("The queue '" + query[0] + "' does not exist.");
            twitch.getDisplayName(query[1], (name) => {
                let pos = result.names.indexOf(name) + 1;
                if (pos > 0) return callback("Oops, " + name + " is already in the queue '" + result.queue + "' in position (" + pos + ").");
                result.names.push(name);
                mongo.queues.update({_id: result._id}, {names: result.names, modified: moment()}, (err) => {
                    if (err) {
                        utils.log("db error: update addUser: " + JSON.stringify(err));
                        return callback("Database Error");
                    }
                    emitQueues();
                    return callback(name + " was added to position (" + result.names.length + ") in the queue '" + result.queue + "'.");
                });
            });
        });
    }

    function removeUser(action, query, callback) {
        if (!query[0] || !query[1]) return callback("Usage: !q " + action + " &lt;queue&gt; &lt;name&gt;");
        let queue = new RegExp("^" + query[0] + "$", 'i');
        mongo.queues.findOne({queue: queue}, (err, result) => {
            if (err) {
                utils.log("db error: find removeUser: " + JSON.stringify(err));
                return callback("Database Error");
            }
            if (!result) return callback("The queue '" + query[0] + "' does not exist.");
            if (query[1] == "*") {
                if (result.names.length == 0) return callback("Oops, looks like the queue '" + result.queue + "' is empty.");
                query[1] = result.names[0];
            }
            twitch.getDisplayName(query[1], (name) => {
                let pos = result.names.indexOf(name) + 1;
                if (pos == 0) return callback("Oops, " + name + " wasn't found in the queue '" + result.queue + "'.");
                result.names.splice(pos - 1, 1);
                mongo.queues.update({_id: result._id}, {names: result.names, modified: moment()}, (err) => {
                    if (err) {
                        utils.log("db error: update removeUser: " + JSON.stringify(err));
                        return callback("Database Error");
                    }
                    let str = name + " was removed from the queue";
                    if (result.names.length == 0) return callback(str += ". The queue '" + result.queue + "' is now empty.");
                    str += " ";
                    nextList(null, [query[0]], (r) => {
                        emitQueues();
                        return callback(str + r);
                    });
                });
            });
        });
    }

    function bumpUser(action, query, callback) {
        if (!query[0] || !query[1]) return callback("Usage: !q " + action + " &lt;queue&gt; &lt;name&gt; [position]");
        let bump = 0;
        if (query[2]) {
            if (parseInt(query[2])) {
                bump = parseInt(query[2]);
            } else {
                return callback("[position] must be a number greater than 0");
            }
        }
        let queue = new RegExp("^" + query[0] + "$", 'i');
        mongo.queues.findOne({queue: queue}, (err, result) => {
            if (err) {
                utils.log("db error: find bumpUser: " + JSON.stringify(err));
                return callback("Database Error");
            }
            if (!result) return callback("The queue '" + query[0] + "' does not exist.");
            if (bump > result.names.length || bump == 0) bump = result.names.length;
            if (query[1] == "*") {
                if (result.names.length == 0) return callback("Oops, looks like the queue '" + result.queue + "' is empty.");
                query[1] = result.names[0];
            }
            twitch.getDisplayName(query[1], (name) => {
                let pos = result.names.indexOf(name) + 1;
                if (pos == 0) return callback("Oops, " + name + " wasn't found in the queue '" + result.queue + "'.");
                result.names.splice(pos - 1, 1);
                result.names.splice(bump - 1, 0, name);
                mongo.queues.update({_id: result._id}, {names: result.names, modified: moment()}, (err) => {
                    if (err) {
                        utils.log("db error: update bumpUser: " + JSON.stringify(err));
                        return callback("Database Error");
                    }
                    let str = name + " was bumped to";
                    if (bump >= result.names.length || bump == 0) {
                        str += " the bottom of";
                    } else {
                        str += " position (" + bump + ") of";
                    }
                    str += " the queue ";
                    nextList(null, [query[0]], (r) => {
                        emitQueues();
                        return callback(str + r);
                    });
                });
            });
        });
    }

    function findUser(action, query, callback) {
        if (!query[0]) return callback("Usage: !q " + action + " &lt;name&gt;");
        twitch.getDisplayName(query[0], (name) => {
            let found = [];
            mongo.queues.find({}).sort({modified: -1}).exec((err, results) => {
                if (err) {
                    utils.log("db error: find findUser: " + JSON.stringify(err));
                    return callback("Database Error");
                }
                for (let i = 0; i < results.length; i++) {
                    let j = results[i].names.indexOf(name);
                    if (j == -1) continue;
                    found.push({queue: results[i].queue, position: j});
                }
                if (found.length == 0) return callback(name + " was not found in any queues.");
                let str = name + " is in position - (";
                for (let i = 0; i < found.length; i++) {
                    str += (found[i].position + 1) + ") in '" + found[i].queue + "'";
                    if (i < found.length - 1) {
                        str += " | (";
                    }
                }
                return callback(str);
            });
        });
    }

    function nextList(action, query, callback) {
        if (!query[0]) return callback("Usage: !q " + action + " &lt;queue&gt; [number]");
        let queue = new RegExp("^" + query[0] + "$", 'i');
        mongo.queues.findOne({queue: queue}, (err, result) => {
            if (err) {
                utils.log("db error: find nextList: " + JSON.stringify(err));
                return callback("Database Error");
            }
            if (!result) return callback("The queue '" + query[0] + "' does not exist.");
            if (result.names.length == 0) return callback("The queue '" + result.queue + "' is empty.");
            let count = options.queue.default_next_shown;
            if (query[1]) {
                if (parseInt(query[1])) {
                    count = parseInt(query[1]);
                } else if (query[1] == "*") {
                    count = result.names.length;
                } else {
                    return callback("[number] must be a number greater than 0 or *");
                }
            }
            if (count > result.names.length) count = result.names.length;
            let str = "";
            str += "'" + result.queue + "' (" + result.names.length + ") - Next ";
            count == 1 ? str += "player" : str += count + " players";
            str += " - ";
            for (let i = 0; i < count; i++) {
                str += (i + 1) + ": " + result.names[i];
                if (i < count - 1) str += " | ";
            }
            return callback(str);
        });
    }

    function emitQueues() {
        mongo.queues.find({}).sort({modified: -1}).exec((err, results) => {
            if (err) return utils.log("db error: find emitQueues: " + JSON.stringify(err));
            app.io.emit('queues_list', results);
        });
    }
};
