var hl = require('./highlight-sql').highlight;

var colors = {
    //styles
    'bold'      : '\x1B[1m',
    'faint'     : '\x1B[2m',
    'italic'    : '\x1B[3m',
    'underline' : '\x1B[4m',
    'inverse'   : '\x1B[7m',
    //grayscale
    'white'     : '\x1B[37m',
    'grey'      : '\x1B[90m',
    'black'     : '\x1B[30m',
    //colors
    'blue'      : '\x1B[34m',
    'cyan'      : '\x1B[36m',
    'green'     : '\x1B[32m',
    'magenta'   : '\x1B[35m',
    'red'       : '\x1B[31m',
    'yellow'    : '\x1B[33m',

    'reset'     : '\x1B[0m'
};

module.exports = function(sql) {
    var html = hl("sql", sql).value;

    var convert = {
        'comment':    ['grey'],
        'operator':   null,
        'keyword':    ['bold', 'blue'],
        'built_in':   ['yellow'],
        'literal':    ['bold', 'cyan'],
        'number':     ['green'],
        'string':     ['magenta']
    };

    var styles = Object.keys(convert);

    var cli = html.replace(/<span.*?>/g, function(tag) {
        var color, esc = '';
        styles.forEach(function(style) {
            if (tag.match(style)) color = convert[style];
        });
        if (color) color.forEach(function(c) {
            esc += colors[c];
        });
        return esc;
    })
    .replace(/<\/span>/g, colors.reset);

    return cli;
};
