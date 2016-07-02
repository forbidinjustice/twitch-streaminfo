'use strict';

//Connect to websocket on same location:port
var io = io(document.location.href.replace("http", "ws")),
    firstTip = true,
    firstSub = true,
    firstCheer = true,
    maxListLength = 8;

//Established a connected to the websocket server
io.on('connected', () => {
    log("connected to the websocket");
    $('#socket_status').addClass('connected');
});

//Disconnected from the websocket server
io.on('disconnect', () => {
    log("disconnected from the websocket");
    $('.statusBar span').removeClass('connected');
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
            if (key == 'slow') {
                if (checked) {
                    $('.slow_amount').text("(" + data[key] + ")");
                } else {
                    $('.slow_amount').text("");
                }
            }
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
io.on('new_tips', (data) => {
    console.log("new_tips", data);
    data.forEach((tip) => {
        addTip(tip);
    });
});

//New Sub Event
io.on('subscription', (data) => {
    console.log("sub", data);
    addSub(data);
});

//New Cheer
io.on('cheer', (data) => {
    console.log("cheer", data);
    addCheer(data);
});

//New Host Event
io.on('host', (data) => {
    console.log("host", data);
    //TODO: add html list for this
});

$(document).ready(function () {
    $('.channel_controls input').click(function () {
        let div = $(this).parent().parent();
        let name = div[0].className;
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
    let usd = parseFloat(data.amount).toFixed(2);
    $('.columns .tips ul').prepend("<li>" + data.name + " <span class='amount'>($" + usd + ")</span></li>");
    if ($('.columns .tips ul').children().length > maxListLength) $('.columns .tips ul li:last-child').remove();
}

function addSub(data) {
    if (firstSub) {
        firstSub = false;
        $('.columns .subs ul').empty();
    }
    let months = data.months > 1 ? "(" + data.months + " months)" : "(NEW SUB)";
    $('.columns .subs ul').prepend("<li>" + data.username + " <span class='amount'>" + months + "</span></li>");
    if ($('.columns .subs ul').children().length > maxListLength) $('.columns .subs ul li:last-child').remove();
}

function addCheer(data) {
    if (firstCheer) {
        firstCheer = false;
        $('.columns .cheers ul').empty();
    }
    $('.columns .cheers ul').prepend("<li>" + data.username + " <span class='amount'>(" + data.bits + ")</span></li>");
    if ($('.columns .cheers ul').children().length > maxListLength) $('.columns .cheers ul li:last-child').remove();
}
