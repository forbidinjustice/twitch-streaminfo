'use strict';
const moment = require('moment');

module.exports = function () {

    //Log a string to the console with a date/time appended
    function log(str) {
        console.log("[" + moment.utc().format('YYYY-MM-DD HH:mm:ss') + "] " + str);
    }

    return {
        log: log
    }
};
