var _ = require('lodash');
var colors = require('colors');

var fn = exports;

fn.logger = console.log;

fn.log = function(str) {
    var msg;

    if (fn.logger == console.log) {
        msg = '[GCR] '.bold.blue + str;
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
        msg = 'ERROR '.bold.red + str;
    else msg = 'ERROR: ' + str;

    fn.log(msg);
    if (kill) process.exit(1);
    return new Error(str);
};

fn.warn = function(str) {
    var msg = 'WARNING '.bold.yellow + str;
    return fn.log(msg);
};

fn.database = function(str, type, ms) {

    type = type || '';

    function cols(txt) {
        var str = " ", spaces = 23 - txt.length;
        for (var i = 0; i < spaces; i++) str += " ";
        return txt + str;
    }

    var task = (type==='') ? '' : type + " (" + convertTime(ms) + ")";

    if (fn.logger == console.log) {
        fn.logger(cols(task).bold.cyan + str);
    } else {
        fn.logger(cols(task) + str);
    }
};

function convertTime(ms) {
    if (ms < 1000) return ms +'ms';
    if (ms < 60000) return (ms/1000).toFixed(2) + 's';
    var m = Math.floor(ms/60000);
    var s = Math.round((ms - m * 60000)/1000);
    return m + 'm' + s + 's';
}
