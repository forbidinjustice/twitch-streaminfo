'use strict';

//Connect to websocket on same location:port
var io = io(document.location.href.replace("http", "ws"));

//Established a connected to the websocket server
io.on('connected', () => {
    log("connected to the websocket");
});

//Disconnected from the websocket server
io.on('disconnect', () => {
    log("disconnected from the websocket");
});

//Log a string to the console with a timestamp appended
function log(str) {
    console.log("[" + moment.utc().format('YYYY-MM-DD HH:mm:ss') + "] " + str);
}

//Status Change
io.on('status', (data) => {
    console.log("status", data);
});

//New Sub Event
io.on('subscription', (data) => {
    console.log("sub", data);
});

//New Cheer
io.on('cheer', (data) => {
    console.log("cheer", data);
});

//New Host Event
io.on('host', (data) => {
    console.log("host", data);
});
