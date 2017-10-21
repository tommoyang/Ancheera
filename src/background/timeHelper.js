function parseDate(date) {
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

function getJstNowDate() {
    var jstMinutesOffset = 540;
    var nowJstDate = new Date();
    nowJstDate.setMinutes(nowJstDate.getMinutes() + nowJstDate.getTimezoneOffset() + jstMinutesOffset);
    return nowJstDate;
}

function parseTime(diff, unit) {
    var str = "";
    var parse;
    var letters = ['d', 'h', 'm', 's'];
    var index = letters.indexOf(unit);
    if (index !== -1) {
        for (var i = index, count = 0; i < letters.length && count < 2; i++) {
            switch (letters[i]) {
                case 'd':
                    parse = parseInt(diff / (1000 * 60 * 60 * 24));
                    break;
                case 'h':
                    parse = parseInt(diff / (1000 * 60 * 60)) % 24;
                    break;
                case 'm':
                    parse = parseInt(diff / (1000 * 60)) % 60;
                    break;
                case 's':
                    parse = parseInt((diff / 1000) % 60);
                    break;
            }
            if (i < letters.length - 1 || count > 0 || parse > 0) {
                if (count > 0) {
                    count++;
                    str += parse + letters[i];
                } else {
                    if (parse > 0 && i < letters.length - 1) {
                        str += parse + letters[i] + ', ';
                        count++;
                    } else if (parse > 0 && i === letters.length - 1) {
                        str += parse + letters[i];
                    }
                }
            } else {
                str = '<1s';
            }
        }
    } else {
        str = "PARSETIME ERROR";
    }
    return str;
}

window.TimeHelper = {
    parseDate: parseDate,
    parseTime: parseTime,
    getJstNowDate: getJstNowDate
};