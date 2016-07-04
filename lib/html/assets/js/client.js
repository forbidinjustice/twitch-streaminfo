'use strict';

//Connect to websocket on same location:port
var io = io(document.location.href.replace("http", "ws")),
    firstTip = true,
    firstSub = true,
    firstCheer = true,
    maxListLength = 15,
    bitBadges = {};

//Established a connected to the websocket server
io.on('connected', () => {
    log("connected to the websocket");
    $('#socket_status').addClass('connected');
    io.emit('get_bit_badges');
});

//Disconnected from the websocket server
io.on('disconnect', () => {
    log("disconnected from the websocket");
    $('.statusBar span').removeClass('connected');
    firstTip = true;
    firstSub = true;
    firstCheer = true;
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
    $(".columns .tips").animate({scrollTop: 0}, "slow");
    data.forEach((tip) => {
        addTip(tip);
    });
});

//New Sub Event
io.on('subscription', (data) => {
    console.log("sub", data);
    $(".columns .subs").animate({scrollTop: 0}, "slow");
    addSub(data);
});

//New Cheer
io.on('cheer', (data) => {
    console.log("cheer", data);
    $(".columns .cheers").animate({scrollTop: 0}, "slow");
    addCheer(data);
});

//New Host Event
io.on('host', (data) => {
    console.log("host", data);
    //TODO: add html list for this
});

$(document).ready(function () {
    setTimeout(() => {
        $('.columns').fadeIn(500);
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
        $('.columns .tips ul').empty();
    }
    let time = moment(parseInt(data['created_at'] + "000")).format('h:mma M/D/YY');
    let usd = parseFloat(data.amount).toFixed(2);
    $('.columns .tips ul').prepend("<li><div class='time'>" + time + "</div><span class='username'>" + data.name +
        " <span class='amount'>($" + usd + ")</span></span><div class='message'>" + data.message +
        "</div><div class='email'>" + data.email + "</div></li>");
    if ($('.columns .tips ul').children().length > maxListLength) $('.columns .tips ul li:last-child').remove();
}

function addSub(data) {
    if (firstSub) {
        firstSub = false;
        $('.columns .subs ul').empty();
    }
    let time = moment(data.date).format('h:mma M/D/YY');
    let months = data.months > 1 ? "(" + data.months + " months)" : "(NEW SUB)";
    let message = data.message ? data.message : "";
    $('.columns .subs ul').prepend("<li><div class='time'>" + time + "</div><span class='username'>" + data.username +
        " <span class='amount'>" + months + "</span></span><div class='message'>" + message + "</div></li>");
    if ($('.columns .subs ul').children().length > maxListLength) $('.columns .subs ul li:last-child').remove();
}

function addCheer(data) {
    if (firstCheer) {
        firstCheer = false;
        $('.columns .cheers ul').empty();
    }
    let time = moment(data.date).format('h:mma M/D/YY');
    let message = getCheerBadges(data.message);
    $('.columns .cheers ul').prepend("<li><div class='time'>" + time + "</div><span class='username'>" + data.username +
        " <span class='amount tie_" + getBitTier(data.bits) + "'>(" + data.bits + ")</span></span><div class='message'>" +
        message + "</div></li>");
    if ($('.columns .cheers ul').children().length > maxListLength) $('.columns .cheers ul li:last-child').remove();
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

//Received Queues list
io.on('queues_list', (data) => {
    console.log("queues_list", data);
    $('.queues ul').empty();
    data[0] == null ? $('.queues h2').show() : $('.queues h2').hide();
    for (let i = 0; i < data.length; i++) {
        $('.queues > ul').append("<li><h3><button class='next' title='Next - " + data[i].queue + "' onclick='queueBtn(\"n " + data[i].queue + "\")'></button></span>" +
            data[i].queue + "<span class='count'>" + data[i].names.length + "</h3><ul class='names_" + data[i].queue + "'></ul></li>");
        var max = 4;
        if (max > data[i].names.length) max = data[i].names.length;
        for (let j = 0; j < max; j++) {
            $('.names_' + data[i].queue).append("<li>" + data[i].names[j] + "<span><button class='bump' title='Bump - " + data[i].names[j] + "' onclick='queueBtn(\"b " +
                data[i].names[j] + " " + data[i].queue + "\")'></button><button class='remove' title='Remove - " + data[i].names[j] + "' onclick='queueBtn(\"r " +
                data[i].names[j] + " " + data[i].queue + "\")'></button></span></li>");
        }
    }
});
