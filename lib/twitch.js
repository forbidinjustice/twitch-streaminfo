'use strict';
const config = require('../config');
const tmi = require('tmi.js');
const request = require('request');
const logger = require('winston');
const myEvents = require('./events');
const utils = require('./utilities');
const qs = require('querystring');
const TwitchPS = require('twitchps');

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

  // Instantiate new Twitch PUB/SUB client
  const ps = new TwitchPS({
    init_topics: [
      { topic: `channel-bits-events-v1.${config.twitch.id}`, token: config.twitch.accessToken },
      { topic: `channel-subscribe-events-v1.${config.twitch.id}`, token: config.twitch.accessToken },
    ],
    reconnect: true,
    debug: false,
  });

  ps.on('connected', () => {
    logger.info('connected to the Twitch PubSub');
    config.status.twitch_ps = true;
    app.io.emit('status', { twitch_ps: true });
  });

  ps.on('disconnected', () => {
    logger.warn('disconnected to the Twitch PubSub');
    config.status.twitch_ps = false;
    app.io.emit('status', { twitch_ps: false });
  });

  ps.on('reconnecting', () => {
    logger.info('reconnecting to the Twitch PubSub');
  });

  // New sub or resub event
  ps.on('subscribe', data => {
    logger.info(`${data.display_name} has just subscribed with a ${subTier(data.sub_plan)} sub. ` +
      `${data.months} months in a row.`);
    app.io.emit('subscription', data);
    const entry = mongo.subscribers({ sub: data });
    entry.save();
  });

  // New Cheer event
  ps.on('bits', data => {
    logger.info(`${data.user_name} has just cheered with ${data.bits_used} bits`);
    app.io.emit('cheer', data);
    const entry = mongo.cheers({ cheer: data });
    entry.save();
  });

  // Successful connection to Twitch IRC
  twitch.on('connected', (server, port) => {
    logger.info(`connected to: ${server}:${port}`);
    logger.info(`connected to Twitch channel ${config.twitch.channel} as '${config.twitch.nick}'`);
    config.status.twitch_chat = true;
    app.io.emit('status', { twitch_chat: true });
    app.io.emit('twitch_chat_status', config.twitch.status);
  });

  // Disconnected from Twitch IRC for some reason
  twitch.on('disconnected', reason => {
    logger.info('disconnected from Twitch:', reason);
    config.status.twitch_chat = false;
    app.io.emit('status', { twitch_chat: false });
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
    app.io.emit('twitch_chat_status', config.twitch.status);
  });

  // Channel toggled Emotes Only Mode
  twitch.on('emoteonly', (channel, enabled) => {
    logger.ingo(`emoteonly in ${channel}: ${enabled}`);
    config.twitch.status.emoteonly = enabled;
    app.io.emit('twitch_chat_status', { emoteonly: enabled });
  });

  // Channel toggled R9K Mode
  twitch.on('r9kbeta', (channel, enabled) => {
    logger.info(`r9k in ${channel}: ${enabled}`);
    config.twitch.status.r9kbeta = enabled;
    app.io.emit('twitch_chat_status', { r9kbeta: enabled });
  });

  // Channel toggled Slow Mode
  twitch.on('slowmode', (channel, enabled, length) => {
    const s = enabled ? `: ${length} seconds` : '';
    logger.info(`slowmode in ${channel}: ${enabled}${s}`);
    config.twitch.status.slow = enabled ? length : enabled;
    app.io.emit('twitch_chat_status', { slow: enabled ? length : enabled });
  });

  // Channel toggled Subscribers Mode
  twitch.on('subscribers', (channel, enabled) => {
    logger.info(`sub-mode in ${channel}: ${enabled}`);
    config.twitch.status.subscribers = enabled;
    app.io.emit('twitch_chat_status', { subscribers: enabled });
  });

  // Channel toggled Followers only Mode
  twitch.on('followersonly', (channel, enabled, length) => {
    const s = enabled ? `: ${length} minutes` : '';
    logger.info(`followersonly in ${channel}: ${enabled}${s}`);
    config.twitch.status.followersonly = enabled ? length : enabled;
    app.io.emit('twitch_chat_status', { followersonly: enabled ? length : enabled });
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
      })
      .catch(err => {
        logger.error(err);
        app.io.emit('host', {
          username,
          viewers,
        });
      });
  });

  twitch.on('chat', (channel, userstate, message) => {
    if (userstate.username.toLowerCase() !== config.twitch.channel.toLowerCase() &&
      userstate.subscriber === false && !userstate.mod === false) return;
    const oddshot = message.match(/https:\/\/oddshot.tv\/s\/\S*/);
    const twitchClip = message.match(/https:\/\/clips.twitch.tv\/\S*/);
    logger.debug('Oddshot:', Boolean(oddshot), 'Twitch Clip:', Boolean(twitchClip));
    if (!oddshot && !twitchClip) return;
    mongo.clips.findOne({
      uri: oddshot[0] || twitchClip[0],
    })
      .then(result => {
        logger.debug(Promise.resolve(result));
        if (result) return;
        result = mongo.clips({ uri: oddshot[0] || twitchClip[0] });
        result.save().catch(logger.error);
        if (oddshot) myEvents.emit('clip', { userstate, message, link: oddshot[0] });
        if (twitchClip) myEvents.emit('clip', { userstate, message, link: twitchClip[0] });
      }).catch(logger.error);
  });

  // Get display_name from Twitch API or return username
  function getDisplayName(username) {
    return new Promise((resolve, reject) => {
      const uri = `https://api.twitch.tv/kraken/users?${qs.stringify({
        login: username.toLowerCase(),
        client_id: config.twitch.client_id,
        api_version: 5,
      })}`;
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
      const uri = `https://badges.twitch.tv/v1/badges/global/display?${qs.stringify({
        client_id: config.twitch.client_id,
      })}`;

      request.get({
        url: uri,
        json: true,
      }, (err, res, body) => {
        if (!err && res.statusCode === 200) {
          socket.emit('bit_badges', body.badge_sets.bits.versions);
        }
      });
    });
  });

  function subTier(amount) {
    if (amount === 'Prime') return amount;
    if (amount === '1000') return '$5';
    if (amount === '2000') return '$10';
    if (amount === '3000') return '$25';
    return amount;
  }

  return {
    getDisplayName,
  };
};
