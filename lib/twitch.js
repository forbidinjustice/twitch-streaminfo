'use strict';
const config = require('../config');
const tmi = require('tmi.js');
const request = require('request');
const moment = require('moment');
const logger = require('winston');
const myEvents = require('./events');
const utils = require('./utilities');

module.exports = function Twitch(app, mongo) {
  // Correctly format connection credentials
  config.twitch.nick = config.twitch.nick.toLowerCase();
  config.twitch.channel = `#${config.twitch.channel.replace('#', '')}`;
  config.twitch.oauth = `oauth:${config.twitch.oauth.replace('oauth:', '')}`;

  // Create Twitch status object
  config.twitch.status = {
    emoteonly: false,
    r9kbeta: false,
    slow: false,
    subscribers: false,
    followersonly: false,
  };

  // Set Twitch tmi options
  const tmiOptions = {
    options: { debug: false },
    connection: {
      reconnect: true,
      secure: true,
    },
    identity: {
      username: config.twitch.nick,
      password: config.twitch.oauth,
    },
    channels: [config.twitch.channel],
  };

  // Instantiate new Twitch IRC client
  const twitch = new tmi.client(tmiOptions); // eslint-disable-line new-cap

  // Successful connection to Twitch IRC
  twitch.on('connected', (server, port) => {
    logger.info(`connected to: ${server}:${port}`);
    logger.info(`connected to Twitch channel ${config.twitch.channel} as '${config.twitch.nick}'`);
    config.status.twitch = true;
    app.io.emit('status', { twitch: true });
    app.io.emit('twitch_status', config.twitch.status);
  });

  // Disconnected from Twitch IRC for some reason
  twitch.on('disconnected', reason => {
    logger.info('disconnected from Twitch:', reason);
    config.status.twitch = false;
    app.io.emit('status', { twitch: false });
  });

  let ranOnce = false;
  // Roomstate changed for our connected Twitch channel
  twitch.on('roomstate', (channel, state) => {
    // This field is only supplied on first connect (Unless streamer changes language I suppose)
    if (ranOnce) return;
    ranOnce = true;
    logger.debug('roomstate', state);
    logger.info(`roomstate change for ${channel}`);
    if (state['emote-only'] !== null) {
      config.twitch.status.emoteonly = state['emote-only'];
    }
    if (state.r9k !== null) {
      config.twitch.status.r9kbeta = state.r9k;
    }
    if (state.slow !== null) {
      config.twitch.status.slow = state.slow;
    }
    if (state['subs-only'] !== null) {
      config.twitch.status.subscribers = state['subs-only'];
    }
    if (state['followers-only'] !== null) {
      if (state['followers-only'] === '-1') {
        config.twitch.status.followersonly = false;
      } else if (state['followers-only'] === false) {
        config.twitch.status.followersonly = 0;
      } else {
        config.twitch.status.followersonly = state['followers-only'];
      }
    }
    app.io.emit('twitch_status', config.twitch.status);
  });

  // Channel toggled Emotes Only Mode
  twitch.on('emoteonly', (channel, enabled) => {
    logger.ingo(`emoteonly in ${channel}: ${enabled}`);
    config.twitch.status.emoteonly = enabled;
    app.io.emit('twitch_status', { emoteonly: enabled });
  });

  // Channel toggled R9K Mode
  twitch.on('r9kbeta', (channel, enabled) => {
    logger.info(`r9k in ${channel}: ${enabled}`);
    config.twitch.status.r9kbeta = enabled;
    app.io.emit('twitch_status', { r9kbeta: enabled });
  });

  // Channel toggled Slow Mode
  twitch.on('slowmode', (channel, enabled, length) => {
    const s = enabled ? `: ${length} seconds` : '';
    logger.info(`slowmode in ${channel}: ${enabled}${s}`);
    config.twitch.status.slow = enabled ? length : enabled;
    app.io.emit('twitch_status', { slow: enabled ? length : enabled });
  });

  // Channel toggled Subscribers Mode
  twitch.on('subscribers', (channel, enabled) => {
    logger.info(`sub-mode in ${channel}: ${enabled}`);
    config.twitch.status.subscribers = enabled;
    app.io.emit('twitch_status', { subscribers: enabled });
  });

  // Channel toggled Followers only Mode
  twitch.on('followersonly', (channel, enabled, length) => {
    const s = enabled ? `: ${length} minutes` : '';
    logger.info(`followersonly in ${channel}: ${enabled}${s}`);
    config.twitch.status.followersonly = enabled ? length : enabled;
    app.io.emit('twitch_status', { followersonly: enabled ? length : enabled });
  });

  // Our mod bot was modded in our channel
  twitch.on('mod', (channel, username) => {
    if (username.toLowerCase() !== config.modBotName.toLowerCase() && username.toLowerCase() !== 'revlobot') {
      return;
    }
    logger.info(`${username} joined the channel (modded)`);
    if (username.toLowerCase() === config.modBotName.toLowerCase()) {
      config.status.bot = true;
      app.io.emit('status', { bot: true });
    }
    if (username.toLowerCase() === 'revlobot') {
      config.status.revlo = true;
      app.io.emit('status', { revlo: true });
    }
  });

  // Our mod bot was unmodded in our channel
  twitch.on('unmod', (channel, username) => {
    if (username.toLowerCase() !== config.modBotName.toLowerCase() && username.toLowerCase() !== 'revlobot') {
      return;
    }
    logger.info(`${username} parted the channel (unmodded)`);
    if (username.toLowerCase() === config.modBotName.toLowerCase()) {
      config.status.bot = false;
      app.io.emit('status', { bot: false });
    }
    if (username.toLowerCase() === 'revlobot') {
      config.status.revlo = false;
      app.io.emit('status', { revlo: false });
    }
  });

  // A resub event occurred in Twitch chat
  twitch.on('resub', (channel, username, months, message, method) => {
    logger.info(`${username} has resubbed for ${months} months [${message}] - Prime: ${method ? method.prime : false}`);
    getDisplayName(username)
      .then(name => {
        subEvent(name, months, message, method);
      }).catch(logger.error);
  });

  // A new subscription event occurred in Twitch chat
  twitch.on('subscription', (channel, username, method) => {
    logger.info(`${username} just subscribed - Prime: ${method ? method.prime : false}`);
    getDisplayName(username)
      .then(name => {
        const entry = mongo.lastNewSub({ name });
        entry.save();
        subEvent(name, 1, null, method);
      }).catch(logger.error);
  });

  // A cheer event occurred in Twitch chat
  twitch.on('cheer', (channel, userstate, message) => {
    // Use display_name if available
    const username = utils.displayName(userstate.username, userstate['display-name']);
    logger.info(`${username} has cheered with ${userstate.bits} bit(s) [${message}]`);
    const data = {
      username,
      bits: userstate.bits,
      message,
      date: moment()._d,
    };
    app.io.emit('cheer', data);
    const entry = mongo.cheers(data);
    entry.save();
  });

  // Someone hosted our channel
  twitch.on('hosted', (channel, username, viewers, auto) => {
    logger.info(`${username} hosted the channel: +${viewers} viewer(s) - auto: ${auto}`);
    // Exit if this was an auto host or the host has no viewers
    if (auto || !viewers || viewers === 0) {
      return;
    }
    getDisplayName(username)
      .then(name => {
        app.io.emit('host', {
          username: name,
          viewers,
        });
      }).catch(logger.error);
  });

  twitch.on('chat', (channel, userstate, message) => {
    if (userstate.username.toLowerCase() !== config.twitch.channel.toLowerCase() &&
      userstate.subscriber === false && !userstate.mod === false) return;
    const oddshot = message.match(/https:\/\/oddshot.tv\/shot\/\S*/);
    const twitchClip = message.match(/https:\/\/clips.twitch.tv\/\S*/);
    if (!oddshot && !twitchClip) return;
    if (oddshot) myEvents.emit('clip', { userstate, message, source: 'Oddshot', link: oddshot[0] });
    if (twitchClip) myEvents.emit('clip', { userstate, message, source: 'TwitchClip', link: twitchClip[0] });
  });

  // Handle new sub and resub events
  function subEvent(username, months, message, method) {
    const data = {
      username,
      months,
      message,
      date: moment(),
      method,
    };
    app.io.emit('subscription', data);
    const entry = mongo.subscribers(data);
    entry.save();
  }

  // Get display_name from Twitch API or return username
  function getDisplayName(username) {
    return new Promise((resolve, reject) => {
      const uri = `https://api.twitch.tv/kraken/users?login=${username.toLowerCase()}` +
        `&client_id=${config.twitch.client_id}&api_version=5`;
      logger.debug(uri);
      utils.fetchJSON(uri)
        .then(body => {
          if (body._total > 0) {
            resolve(utils.displayName(body.users[0].name, body.users[0].display_name));
          } else {
            resolve(username);
          }
        })
        .catch(reject);
    });
  }

  // Connect to Twitch IRC
  twitch.connect();

  // Twitch command sent from client page
  app.io.on('connection', (socket) => {
    socket.on('command', (data) => {
      logger.debug(data.command);
      twitch.say(config.twitch.channel, data.command);
    });

    socket.on('get_bit_badges', () => {
      const uri = `https://badges.twitch.tv/v1/badges/global/display?client_id=${config.twitch.client_id}`;
      request.get({
        url: encodeURI(uri),
        json: true,
      }, (err, res, body) => {
        if (!err && res.statusCode === 200) {
          socket.emit('bit_badges', body.badge_sets.bits.versions);
        }
      });
    });
  });

  return {
    getDisplayName,
  };
};
