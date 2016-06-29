'use strict';

//Connect to websocket on same location:port
var io = io(document.location.href.replace("http", "ws"));

io.on('connected', () => {
    console.log("connected to the websocket");
});

io.on('disconnect', () => {
    console.log("disconnected from the websocket");
});
