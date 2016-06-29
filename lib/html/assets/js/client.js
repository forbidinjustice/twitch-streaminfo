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

io.on('status', (data) => {
    console.log(data);
});
