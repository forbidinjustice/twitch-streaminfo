'use strict';
const moment = require('moment');
const logger = require('winston');
const config = require('../config');

module.exports = function Queue(app, mongo, twitch) {
  // Queues list route handler
  app.app.get('/queues/list', (req, res) => {
    mongo.queues.find({}, (err, results) => {
      if (err) {
        logger.error('db error: /queues/list:', err);
        return res.send('Database Error');
      }
      return res.send(results);
    });
  });

  // Queues route handler
  app.app.get('/queues', (req, res) => {
    if (req.query.q === null || req.query.q === 'none') {
      res.send(showBaseCommands());
      return;
    }
    const query = req.query.q.split(' ');
    const action = query.shift();
    switch (action) {
      case 'c':
      case 'create':
        createQueue(action, query, (r) => {
          res.send(r);
        });
        break;
      case 'd':
      case 'delete':
        deleteQueue(action, query, (r) => {
          res.send(r);
        });
        break;
      case 'l':
      case 'list':
        listQueues((r) => {
          res.send(r);
        });
        break;
      case 'a':
      case 'add':
        addUser(action, query, (r) => {
          res.send(r);
        });
        break;
      case 'r':
      case 'remove':
        removeUser(action, query, (r) => {
          res.send(r);
        });
        break;
      case 'b':
      case 'bump':
        bumpUser(action, query, (r) => {
          res.send(r);
        });
        break;
      case 'f':
      case 'find':
        findUser(action, query, (r) => {
          res.send(r);
        });
        break;
      case 'n':
      case 'next':
        nextList(action, query, (r) => {
          res.send(r);
        });
        break;
      default:
        res.send(showBaseCommands());
    }
  });

  function showBaseCommands() {
    return 'Usage: !q [ add | remove | next | bump | find | create | delete | list ]';
  }

  function createQueue(action, query, callback) {
    if (!query[0]) {
      callback(`Usage: !q ${action} &lt;name&gt;`);
      return;
    }
    const queue = new RegExp(`^${query[0]}$`, 'i');
    mongo.queues.findOne({ queue: queue }, (err, result) => {
      if (err) {
        logger.error('db error: find createQueue:', err);
        callback('Database Error');
        return;
      }
      if (result) {
        callback(`The queue '${result.queue}' already exists.`);
        return;
      }
      const data = {
        queue: query[0],
        normalized: query[0].toLowerCase(),
        modified: moment(),
        names: [],
      };
      const entry = mongo.queues(data);
      entry.save(e => {
        if (e) {
          logger.error('db error: save createQueue:', e);
          callback('Database Error');
          return;
        }
        emitQueues();
        callback(`The queue '${query[0]}' has been created.`);
      });
    });
  }

  function deleteQueue(action, query, callback) {
    if (!query[0]) {
      callback(`Usage: !q ${action} &lt;name&gt;`);
      return;
    }
    const queue = new RegExp(`^${query[0]}$`, 'i');
    mongo.queues.findOne({ queue: queue }, (err, result) => {
      if (err) {
        logger.error('db error: find deleteQueue:', err);
        callback('Database Error');
        return;
      }
      if (!result) {
        callback(`The queue '${query[0]}' does not exist.`);
        return;
      }
      mongo.queues.remove({ _id: result._id }, e => {
        if (e) {
          logger.error('db error: save deleteQueue:', e);
          callback('Database Error');
          return;
        }
        emitQueues();
        callback(`The queue '${result.queue}' has been deleted.`);
      });
    });
  }

  function listQueues(callback) {
    mongo.queues.find({}).sort({ normalized: 1 }).exec((err, results) => {
      if (err) {
        logger.error('db error: find listQueues:', err);
        callback('Database Error');
        return;
      }
      if (results.length === 0) {
        callback('There are not any queues to list.');
        return;
      }
      let str = 'Queues - ';
      for (let i = 0; i < results.length; i++) {
        str += `${results[i].queue} (${results[i].names.length})`;
        if (i < results.length - 1) {
          str += ' | ';
        }
      }
      callback(str);
    });
  }

  function addUser(action, query, callback) {
    if (!query[0] || !query[1]) {
      callback(`Usage: !q ${action} &lt;queue&gt; &lt;name&gt;`);
      return;
    }
    const queue = new RegExp(`^${query[0]}$`, 'i');
    mongo.queues.findOne({ queue: queue }, (err, result) => {
      if (err) {
        logger.error('db error: find addUser:', err);
        callback('Database Error');
        return;
      }
      if (!result) {
        callback(`The queue '${query[0]}' does not exist.`);
        return;
      }
      twitch.getDisplayName(query[1], name => {
        const pos = result.names.indexOf(name) + 1;
        if (pos > 0) {
          callback(`Oops, ${name} is already in the queue '${result.queue}' in position (${pos}).`);
          return;
        }
        result.names.push(name);
        mongo.queues.update({ _id: result._id }, { names: result.names, modified: moment() }, e => {
          if (e) {
            logger.error('db error: update addUser:', e);
            callback('Database Error');
            return;
          }
          emitQueues();
          callback(`${name} was added to position (${result.names.length}) in the queue '${result.queue}'.`);
        });
      });
    });
  }

  function removeUser(action, query, callback) {
    if (!query[0] || !query[1]) {
      callback(`Usage: !q ${action} &lt;queue&gt; &lt;name&gt;`);
      return;
    }
    const queue = new RegExp(`^${query[0]}$`, 'i');
    mongo.queues.findOne({ queue: queue }, (err, result) => {
      if (err) {
        logger.error('db error: find removeUser:', err);
        callback('Database Error');
        return;
      }
      if (!result) {
        callback(`The queue '${query[0]}' does not exist.`);
        return;
      }
      if (query[1] === '*') {
        if (result.names.length === 0) {
          callback(`Oops, looks like the queue '${result.queue}' is empty.`);
          return;
        }
        query[1] = result.names[0];
      }
      twitch.getDisplayName(query[1], name => {
        const pos = result.names.indexOf(name) + 1;
        if (pos === 0) {
          callback(`Oops, ${name} wasn't found in the queue '${result.queue}'.`);
          return;
        }
        result.names.splice(pos - 1, 1);
        mongo.queues.update({ _id: result._id }, { names: result.names, modified: moment() }, e => {
          if (e) {
            logger.error('db error: update removeUser:', e);
            callback('Database Error');
            return;
          }
          let str = `${name} was removed from the queue`;
          if (result.names.length === 0) {
            str += `. The queue '${result.queue}' is now empty.`;
            callback(str);
            return;
          }
          str += ' ';
          nextList(null, [query[0]], (r) => {
            emitQueues();
            return callback(str + r);
          });
        });
      });
    });
  }

  function bumpUser(action, query, callback) {
    if (!query[0] || !query[1]) {
      callback(`Usage: !q ${action} &lt;queue&gt; &lt;name&gt; [position]`);
      return;
    }
    let bump = 0;
    if (query[2]) {
      if (parseInt(query[2])) {
        bump = parseInt(query[2]);
      } else {
        callback('[position] must be a number greater than 0');
        return;
      }
    }
    const queue = new RegExp(`^${query[0]}$`, 'i');
    mongo.queues.findOne({ queue: queue }, (err, result) => {
      if (err) {
        logger.error('db error: find bumpUser:', err);
        callback('Database Error');
        return;
      }
      if (!result) {
        callback(`The queue '${query[0]}' does not exist.`);
        return;
      }
      if (bump > result.names.length || bump === 0) {
        bump = result.names.length;
      }
      if (query[1] === '*') {
        if (result.names.length === 0) {
          callback(`Oops, looks like the queue '${result.queue}' is empty.`);
          return;
        }
        query[1] = result.names[0];
      }
      twitch.getDisplayName(query[1], name => {
        const pos = result.names.indexOf(name) + 1;
        if (pos === 0) {
          callback(`Oops, ${name} wasn't found in the queue '${result.queue}'.`);
          return;
        }
        result.names.splice(pos - 1, 1);
        result.names.splice(bump - 1, 0, name);
        mongo.queues.update({ _id: result._id }, { names: result.names, modified: moment() }, e => {
          if (e) {
            logger.error('db error: update bumpUser:', e);
            callback('Database Error');
            return;
          }
          let str = `${name} was bumped to`;
          if (bump >= result.names.length || bump === 0) {
            str += ' the bottom of';
          } else {
            str += ` position (${bump}) of`;
          }
          str += ' the queue ';
          nextList(null, [query[0]], (r) => {
            emitQueues();
            return callback(str + r);
          });
        });
      });
    });
  }

  function findUser(action, query, callback) {
    if (!query[0]) {
      callback(`Usage: !q ${action} &lt;name&gt;`);
      return;
    }
    twitch.getDisplayName(query[0])
      .then(name => {
        mongo.queues.find({}).sort({ modified: -1 }).exec((err, results) => {
          if (err) {
            logger.error('db error: find findUser:', err);
            callback('Database Error');
            return;
          }
          const found = results
            .filter(r => r.names[name])
            .map(r => {
              return { queue: r.queue, position: r.name.indexOf(name) };
            });
          if (found.length === 0) {
            callback(`${name} was not found in any queues.`);
            return;
          }
          let str = `${name} is in position - (`;
          found.forEach(f => {
            str += `${f.position + 1}) in '${f.queue}'`;
            if (found.indexOf(f) !== found.length - 1) {
              str += ' | (';
            }
          });
          callback(str);
        });
      }).catch(logger.error);
  }

  function nextList(action, query, callback) {
    if (!query[0]) {
      callback(`Usage: !q ${action} &lt;queue&gt; [number]`);
      return;
    }
    const queue = new RegExp(`^${query[0]}$`, 'i');
    mongo.queues.findOne({ queue: queue }, (err, result) => {
      if (err) {
        logger.error('db error: find nextList:', err);
        callback('Database Error');
        return;
      }
      if (!result) {
        callback(`The queue '${query[0]}' does not exist.`);
        return;
      }
      if (result.names.length === 0) {
        callback(`The queue '${result.queue}' is empty.`);
        return;
      }
      let count = config.queues.defaultNextShown;
      if (query[1]) {
        if (parseInt(query[1])) {
          count = parseInt(query[1]);
        } else if (query[1] === '*') {
          count = result.names.length;
        } else {
          callback('[number] must be a number greater than 0 or *');
          return;
        }
      }
      if (count > result.names.length) {
        count = result.names.length;
      }
      let str = '';
      str += `'${result.queue}' (${result.names.length}) - Next `;
      str += count === 1 ? 'player' : `${count} players`;
      str += ' - ';
      for (let i = 0; i < count; i++) {
        str += `${i + 1}: ${result.names[i]}`;
        if (i < count - 1) {
          str += ' | ';
        }
      }
      callback(str);
    });
  }

  function emitQueues() {
    mongo.queues.find({}).sort({ modified: -1 }).exec((err, results) => {
      if (err) {
        logger.error('db error: find emitQueues:', err);
      } else {
        app.io.emit('queues_list', results);
      }
    });
  }
};
