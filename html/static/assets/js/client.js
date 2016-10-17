'use strict';

//Connect to websocket on same location:port
var io = io(document.location.href.replace('http', 'ws')),
    firstTip = true,
    firstSub = true,
    firstCheer = true,
    firstHost = true,
    maxListLength = 25,
    bitBadges = {};

//Established a connected to the websocket server
io.on('connect', () => {
    log('connected to the websocket');
    $('#socket_status').addClass('connected');
    io.emit('get_bit_badges');
});

//Disconnected from the websocket server
io.on('disconnect', () => {
    log('disconnected from the websocket');
    $('.statusBar span').removeClass('connected');
    firstTip = true;
    firstSub = true;
    firstCheer = true;
    firstHost = true;
});

//Get cheers list AFTER getting bits badges
io.on('bit_badges', (data) => {
    bitBadges = data;
    io.emit('get_cheers_list');
});

//Log a string to the console with a timestamp appended
function log(str) {
    console.log("[" + moment.utc().format('YYYY-MM-DD HH:mm:ss') + "] " + str);
}

//Status Change
io.on('status', (data) => {
    console.log("status", data);
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            if (data[key]) {
                $('#' + key + '_status').addClass('connected');
            } else {
                $('#' + key + '_status').removeClass('connected');
            }
        }
    }
});

//Twitch Status Change
io.on('twitch_status', (data) => {
    console.log("twitch_status", data);
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            let checked = (data[key] != false);
            $('.channel_controls .' + key + ' input').prop('checked', checked);
            if (key == 'slow') $('.slow_amount').text(checked ? "(" + data[key] + ")" : "");
        }
    }
});

//Received initial Tips list
io.on('tips_list', (data) => {
    console.log("tips_list", data);
    data.forEach((tip) => {
        addTip(tip);
    });
});

//Received initial Subscribers list
io.on('subscribers_list', (data) => {
    console.log("subscribers_list", data);
    data.forEach((sub) => {
        addSub(sub);
    });
});

//Received initial Cheers list
io.on('cheers_list', (data) => {
    console.log("cheers_list", data);
    data.forEach((cheer) => {
        addCheer(cheer);
    });
});

//Received New Tips
io.on('tip', (data) => {
    console.log("new_tips", data);
    $(".tips").animate({scrollTop: 0}, "slow");
    data.forEach((tip) => {
        addTip(tip);
    });
});

//New Sub Event
io.on('subscription', (data) => {
    console.log("sub", data);
    $(".subs").animate({scrollTop: 0}, "slow");
    addSub(data);
});

//New Cheer
io.on('cheer', (data) => {
    console.log("cheer", data);
    $(".cheers").animate({scrollTop: 0}, "slow");
    addCheer(data);
});

//New Host Event
io.on('host', (data) => {
    console.log("host", data);
    if (firstHost) {
        firstHost = false;
        $('.hosts ul').empty();
    }
    $(".hosts").animate({scrollTop: 0}, "slow");
    let time = moment().format('h:mma M/D/YY');
    $('.hosts ul').prepend("<li><div class='time'>" + time + "</div><span class='username'>" + data.username +
        "</span> for <span class='amount'>(" + data.viewers + ")</span> viewer" + (data.viewers == 1 ? "" : "s") + "</li>");
    if ($('.hosts ul').children().length > maxListLength) $('.hosts ul li:last-child').remove();
});

//Received Queues list
io.on('queues_list', (data) => {
    console.log("queues_list", data);
    $('.queues ul').empty();
    if (data.length == 0) {
        $('.queues > ul').append("<li><div class='time hide'>Date</div><span class='username'>Queues</span></li>");
        return;
    }
    for (let i = 0; i < data.length; i++) {
        $('.queues > ul').append("<li><div class='time hide'>Date</div><span class='username'>" +
            data[i].queue + "</span><span class='count'>" + data[i].names.length + "</span><ul class='names_" + data[i].queue + "'></ul></li>");
        var max = 4;
        if (max > data[i].names.length) max = data[i].names.length;
        for (let j = 0; j < max; j++) {
            $('.names_' + data[i].queue).append("<li>" + data[i].names[j] + "<span class='queue_buttons'><button class='bump' title='Bump - " + data[i].names[j] + "' onclick='queueBtn(\"!q b " +
                data[i].queue + " " + data[i].names[j] + "\")'></button><button class='remove' title='Remove - " + data[i].names[j] + "' onclick='queueBtn(\"!q r " +
                data[i].queue + " " + data[i].names[j] + "\")'></button></span></li>");
        }
    }
});

function queueBtn(cmd) {
    io.emit('command', {command: cmd});
}

$(document).ready(function () {
    setTimeout(() => {
        $('.upper').fadeIn(500);
        $('.lower').fadeIn(500);
    }, 1000);

    $('.channel_controls input').click(function (e) {
        e.preventDefault();
        let name = $(this).parent().parent()[0].className;
        let checked = $(this).prop('checked');
        let command = "/" + name + (checked ? "" : "off");
        if (name == 'slow' && checked) command += " 30";
        io.emit('command', {command: command});
    });
});

function addTip(data) {
    if (firstTip) {
        firstTip = false;
        $('.tips ul').empty();
    }
    let time = moment(parseInt(data['created_at'] + "000")).format('h:mma M/D/YY');
    let usd = parseFloat(data.amount).toFixed(2);
    $('.tips ul').prepend("<li><div class='time'>" + time + "</div><span class='username'>" + data.name +
        " <span class='amount'>($" + usd + ")</span></span><div class='message'>" + data.message +
        "</div><div class='email'><span class='address' data-email='" + data.email + "'>Click to show email</span></div></li>");
    if ($('.tips ul').children().length > maxListLength) $('.tips ul li:last-child').remove();

    $('.tips ul li:first-child .address').click(function () {
        $(this).text($(this).data('email'));
    });
}

function addSub(data) {
    if (firstSub) {
        firstSub = false;
        $('.subs ul').empty();
    }
    let time = moment(data.date).format('h:mma M/D/YY');
    let months = data.months > 1 ? "(" + data.months + " months)" : "(NEW SUB)";
    let message = data.message ? data.message : "";
    $('.subs ul').prepend("<li><div class='time'>" + time + "</div><span class='username'>" + data.username +
        " <span class='amount'>" + months + "</span></span><div class='message'>" + message + "</div></li>");
    if ($('.subs ul').children().length > maxListLength) $('.subs ul li:last-child').remove();
}

function addCheer(data) {
    if (firstCheer) {
        firstCheer = false;
        $('.cheers ul').empty();
    }
    let time = moment(data.date).format('h:mma M/D/YY');
    let message = getCheerBadges(data.message);
    $('.cheers ul').prepend("<li><div class='time'>" + time + "</div><span class='username'>" + data.username +
        " <span class='amount tie_" + getBitTier(data.bits) + "'>(" + data.bits + ")</span></span><div class='message'>" +
        message + "</div></li>");
    if ($('.cheers ul').children().length > maxListLength) $('.cheers ul li:last-child').remove();
}

function getCheerBadges(message) {
    if (!message) return;
    message = message.split(" ");
    let reg = new RegExp("cheer[0-9]{1,10}", 'i');
    for (let i = 0; i < message.length; i++) {
        if (reg.test(message[i])) {
            let num = message[i].toLowerCase().split("cheer")[1];
            let tier = getBitTier(num);
            let src = bitBadges[tier] && bitBadges[tier]['image_url_1x'] ? bitBadges[tier]['image_url_1x'] : "";
            message[i] = "<span class='bit_badge tier_" + tier + "'><img src='" + src + "'>" + num + "</span>";
        }
    }
    return message.join(" ");
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
