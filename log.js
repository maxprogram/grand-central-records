var _ = require('lodash');

var bold  = '\033[1m',
    blue  = '\033[34m',
    green = '\033[32m',
    cyan  = '\033[36m',
    red   = '\033[31m',
    mag   = '\033[35m',
    yell  = '\033[33m',
    reset = '\033[0m';

var fn = exports;

fn.logger = console.log;

fn.log = function(str) {
    var msg;

    if (fn.logger == console.log) {
        msg = bold + blue + '[GCR] ' + reset + str;
        fn.logger(msg);
    } else {
        fn.logger(str);
    }

    return str;
};

fn.error = function(str, kill) {
    if (kill === null) kill = false;
    var msg;

    if (fn.logger == console.log)
        msg = bold + red + 'ERROR' + reset + ' ' + str;
    else msg = 'ERROR: ' + str;

    fn.log(msg);
    if (kill) process.exit(1);
    return new Error(str);
};

fn.warn = function(str) {
    var msg = bold + yell + 'WARNING' + reset;
    msg += ' ' + str;

    return fn.log(msg);
};

fn.database = function(str, type, time) {

    type = type || '';

    function cols(txt) {
        var str = " ", spaces = 23 - txt.length;
        for (var i = 0; i < spaces; i++) str += " ";
        return txt + str;
    }

    var task = (type==='') ? '' : type + " (" + time + "ms)";

    if (fn.logger == console.log) {
        fn.logger(bold + cyan + cols(task) + reset + str);
    } else {
        fn.logger(cols(task) + str);
    }
};
