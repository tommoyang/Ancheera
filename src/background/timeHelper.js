var parseDate = function (date) {
    if (date === null) {
        return '';
    }
    var array = date.toString().split(' ');
    var str = '';
    switch (array[1]) {
        case 'Jan':
            str += '1';
            break;
        case 'Feb':
            str += '2';
            break;
        case 'Mar':
            str += '3';
            break;
        case 'Apr':
            str += '4';
            break;
        case 'May':
            str += '5';
            break;
        case 'Jun':
            str += '6';
            break;
        case 'Jul':
            str += '7';
            break;
        case 'Aug':
            str += '8';
            break;
        case 'Sep':
            str += '9';
            break;
        case 'Oct':
            str += '10';
            break;
        case 'Nov':
            str += '11';
            break;
        case 'Dec':
            str += '12';
            break;
    }
    str += '/' + array[2] + ' ';
    var parse = parseInt(array[4][0] + array[4][1]);
    if (parse >= 1 && parse <= 11) {
        str += parse + 'AM';
    } else if (parse >= 13 && parse <= 23) {
        str += (parse - 12) + 'PM';
    } else if (parse === 0) {
        str += '12AM';
    } else {
        str += '12PM';
    }
    return str;
}

window.TimeHelper = {
    parseDate: parseDate
};