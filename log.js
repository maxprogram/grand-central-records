var _ = require('underscore');

var bold  = '\033[1m',
    blue  = '\033[34m',
    green = '\033[32m',
    cyan  = '\033[36m',
    red   = '\033[31m',
    mag   = '\033[35m',
    yell  = '\033[33m',
    reset = '\033[0m';

exports.log = function(str) {
    var msg = bold + blue + '[GCR] ' + reset;
    msg += str;

    console.log(msg);
    return str;
};

exports.error = function(str, kill) {
    if (kill === null) kill = false;
    var msg = bold + red + 'ERROR' + reset;
    msg += ' ' + str;

    exports.log(msg);
    if (kill) process.exit(1);
    return new Error(str);
};

exports.warn = function(str) {
    var msg = bold + yell + 'WARNING' + reset;
    msg += ' ' + str;

    return exports.log(msg);
};

exports.database = function(str, type, time) {

    type = type || '';

    function cols(txt) {
        var str = " ", spaces = 23 - txt.length;
        for (var i = 0; i < spaces; i++) str += " ";
        return txt + str;
    }

    var task = (type==='') ? '' : type + " (" + time + "ms)";
    console.log(bold + cyan + cols(task) + reset + str);

};
