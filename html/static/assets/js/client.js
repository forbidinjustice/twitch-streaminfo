'use strict';

// Connect to websocket on same location:port
const ws = io(document.location.href.replace('http', 'ws'));
let firstTip = true;
let firstSub = true;
let firstCheer = true;
let firstHost = true;
const maxListLength = 25;
let bitBadges = {};

// Established a connected to the websocket server
ws.on('connect', () => {
  console.log('connected to the websocket');
  $('#socket_status').addClass('connected');
  ws.emit('get_bit_badges');
});

// Disconnected from the websocket server
ws.on('disconnect', () => {
  console.log('disconnected from the websocket');
  $('.statusBar span').removeClass('connected');
  firstTip = true;
  firstSub = true;
  firstCheer = true;
  firstHost = true;
});

// Get cheers list AFTER getting bits badges
ws.on('bit_badges', (data) => {
  bitBadges = data;
  ws.emit('get_cheers_list');
});

// Status Change
ws.on('status', (data) => {
  console.log('status', data);
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      if (data[key]) {
        $(`#${key}_status`).addClass('connected');
      } else {
        $(`#${key}_status`).removeClass('connected');
      }
    }
  }
});

// Twitch Status Change
ws.on('twitch_status', (data) => {
  console.log('twitch_status', data);
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const checked = data[key] !== false;
      $(`.channel_controls .${key} input`).prop('checked', checked);
      let amount;
      if (key === 'slow') {
        amount = data[key];
        if (amount > 60) {
          amount = `${Math.floor(Math.round(amount / 60))}m`;
        } else {
          amount = `${amount}s`;
        }
        $('.slow_amount').text(checked ? `(${amount})` : '');
      }
      if (key === 'followersonly') {
        $('.followers_amount').text(checked ? `(${data[key]}m)` : '');
      }
    }
  }
});

// Received initial Tips list
ws.on('tips_list', (data) => {
  console.log('tips_list', data);
  data.forEach((tip) => {
    addTip(tip, true);
  });
});

// Received initial Subscribers list
ws.on('subscribers_list', (data) => {
  console.log('subscribers_list', data);
  data.forEach((sub) => {
    addSub(sub, true);
  });
});

// Received initial Cheers list
ws.on('cheers_list', (data) => {
  console.log('cheers_list', data);
  data.forEach((cheer) => {
    addCheer(cheer, true);
  });
});

// Received New Tips
ws.on('tip', (data) => {
  console.log('new_tips', data);
  $('.tips').animate({ scrollTop: 0 }, 'slow');
  data.forEach((tip) => {
    addTip(tip);
  });
});

// New Sub Event
ws.on('subscription', (data) => {
  console.log('sub', data);
  $('.subs').animate({ scrollTop: 0 }, 'slow');
  addSub(data);
});

// New Cheer
ws.on('cheer', (data) => {
  console.log('cheer', data);
  $('.cheers').animate({ scrollTop: 0 }, 'slow');
  addCheer(data);
});

// New Host Event
ws.on('host', (data) => {
  console.log('host', data);
  if (firstHost) {
    firstHost = false;
    $('.hosts ul').empty();
  }
  $('.hosts').animate({ scrollTop: 0 }, 'slow');
  $('.hosts ul').prepend(`<li class="highlighted"><div class='time'>${getTime()}` +
    `</div><span class='username'>${data.username}` +
    `</span> for <span class='amount'>(${data.viewers})</span> viewer${(data.viewers === 1 ? '' : 's')}</li>`);
  if ($('.hosts ul').children().length > maxListLength) {
    $('.hosts ul li:last-child').remove();
  }

  $('.hosts li').click(function (e) {
    $(this).addClass('cleared');
  });
});

// Received Queues list
ws.on('queues_list', (data) => {
  console.log('queues_list', data);
  $('.queues ul').empty();
  if (data.length === 0) {
    $('.queues > ul').append("<li class='cleared'><div class='time hide'>Date</div>` +" +
      "`<span class='username'>Queues</span></li>");
    return;
  }
  for (let i = 0; i < data.length; i++) {
    $('.queues > ul').append(`<li class='cleared'><div class='time hide'>Date</div>` +
      `<span class='username'>${data[i].queue}</span>` +
      `<span class='count'>${data[i].names.length}</span><ul class='names_${data[i].queue}'></ul></li>`);
    let max = 4;
    if (max > data[i].names.length) {
      max = data[i].names.length;
    }
    for (let j = 0; j < max; j++) {
      $(`.names_${data[i].queue}`).append(`<li class='cleared'>${data[i].names[j]}` +
        `<span class='queue_buttons'><button class='bump' ` +
        `title='Bump - ${data[i].names[j]}' onclick='queueBtn("!q b ${data[i].queue} ${data[i].names[j]}")'>` +
        `</button><button class='remove' title='Remove - ${data[i].names[j]}' onclick='queueBtn("!q r ` +
        `${data[i].queue} ${data[i].names[j]}")'></button></span></li>`);
    }
  }
});

function queueBtn(cmd) {
  ws.emit('command', { command: cmd });
}

$(document).ready(() => {
  setTimeout(() => {
    $('.upper').fadeIn(500);
    $('.lower').fadeIn(500);
  }, 1000);

  $('.channel_controls input').click(function (e) {
    e.preventDefault();
    let name = $(this).parent().parent()[0].className;
    if (name === 'followersonly') name = 'followers';
    const checked = $(this).prop('checked');
    let command = `/${name}${checked ? '' : 'off'}`;
    if (name === 'slow' && checked) command += ' 30';
    if (name === 'followers' && checked) command += ' 15';
    ws.emit('command', { command: command });
  });
});

function addTip(data, cleared) {
  if (firstTip) {
    firstTip = false;
    $('.tips ul').empty();
  }
  const time = getTime(parseInt(`${data.created_at}000`));
  const usd = parseFloat(data.amount).toFixed(2);
  $('.tips ul').prepend(`<li class="${cleared ? 'cleared' : ''}">` +
    `<div class='time'>${time}</div><span class='username'>${data.name}` +
    ` <span class='amount'>$${usd}</span></span><div class='message'>${data.message}` +
    `</div><div class='email'><span class='address' data-email='${data.email}'>Show email</span></div></li>`);
  if ($('.tips ul').children().length > maxListLength) {
    $('.tips ul li:last-child').remove();
  }

  $('.tips ul li:first-child .address').click(function () {
    $(this).text($(this).data('email'));
  });

  $('.tips li').click(function (e) {
    $(this).addClass('cleared');
  });
}

function addSub(data, cleared) {
  if (firstSub) {
    firstSub = false;
    $('.subs ul').empty();
  }
  const months = data.months > 1 ? `(${data.months} months)` : '(NEW SUB)';
  const message = data.message ? data.message : '';
  const primeBadge = 'https://static-cdn.jtvnw.net/badges/v1/a1dd5073-19c3-4911-8cb4-c464a7bc1510/1';
  $('.subs ul').prepend(`<li class="${cleared ? 'cleared' : ''}">` +
    `<div class='prime' hidden><img src=${primeBadge}>` +
    `</div><div class='time'>${getTime(data.date)}</div><span class='username'>${data.username}` +
    ` <span class='amount'>${months}</span></span><div class='message'>${message}</div></li>`);
  if ($('.subs ul').children().length > maxListLength) {
    $('.subs ul li:last-child').remove();
  }
  if (data.method && data.method.prime) {
    $($('.subs ul').children()[0]).find('.prime').show();
  }
  $('.subs li').click(function (e) {
    $(this).addClass('cleared');
  });
}

function addCheer(data, cleared) {
  if (firstCheer) {
    firstCheer = false;
    $('.cheers ul').empty();
  }
  const message = getCheerBadges(data.message);
  $('.cheers ul').prepend(`<li class="${cleared ? 'cleared' : ''}">` +
    `<div class='time'>${getTime(data.date)}</div><span class='username'>${data.username}` +
    ` <span class='amount tie_${getBitTier(data.bits)}'>(${data.bits})</span></span><div class='message'>` +
    `${message}</div></li>`);
  if ($('.cheers ul').children().length > maxListLength) {
    $('.cheers ul li:last-child').remove();
  }
  $('.cheers li').click(function (e) {
    $(this).addClass('cleared');
  });
}

function getCheerBadges(message) {
  message = message.split(' ');
  const reg = new RegExp('cheer[0-9]{1,10}', 'i');
  for (let i = 0; i < message.length; i++) {
    if (reg.test(message[i])) {
      const num = message[i].toLowerCase().split('cheer')[1];
      const tier = getBitTier(num);
      const src = bitBadges[tier] && bitBadges[tier].image_url_1x ? bitBadges[tier].image_url_1x : '';
      message[i] = `<span class='bit_badge tier_${tier}'><img src='${src}'>${num}</span>`;
    }
  }
  return message.join(' ');
}

function getBitTier(num) {
  if (num < 100) {
    return 1;
  } else if (num < 1000) {
    return 100;
  } else if (num < 5000) {
    return 1000;
  } else if (num < 10000) {
    return 5000;
  } else if (num < 100000) {
    return 10000;
  } else {
    return 100000;
  }
}

function getTime(date) {
  if (date) {
    return moment(date).format('h:mma M/D/YY');
  } else {
    return moment().format('h:mma M/D/YY');
  }
}
