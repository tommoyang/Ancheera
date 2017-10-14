(function () {
    var clocktimer = false;
    var date;
    var dailyReset = null;
    var weeklyReset = null;
    var monthlyReset = null;

    var isAssaultTime = false;
    var nextAssaultTime = null;
    var assaultTimes = [-1, -1];

    var isDefenseOrder = false;
    var nextDefenseOrder = null;

    var timeZone;

    var anchiraSun = '#f8e5be';
    var anchiraAlert = '#ffd4e3';
    var nightSun = '#705d7f';
    var nightAlert = '#749d91';

    var time = {
        'daily': 0,
        'weekly': 0,
        'monthly': 0,
        'assault-0': -1,
        'assault-1': -1,
        'defense-active': false,
        'defense-time': null
    };

    var timesTill = {
        'daily-time': null,
        'weekly-time': null,
        'monthly-time': null,
        'assault-time': null,
        'defense-time': null,
    };

    var jstTimes = {
        'time': null,
        'date': null,
        'daily-date': null,
        'weekly-date': null,
        'monthly-date': null,
        'assault-date-0': null,
        'assault-date-1': null,
        'defense-date': null
    };

    var normalTimes = {
        'time': null,
        'date': null,
        'daily-date': null,
        'weekly-date': null,
        'monthly-date': null,
        'assault-date-0': null,
        'assault-date-1': null,
        'defense-date': null
    };

    var isActiveTimes = {
        'is-daily': false,
        'is-weekly': false,
        'is-monthly': false,
        'is-assault': false,
        'is-defense': false
    }

    window.Time = {
        Initialize: function (callback) {
            date = new Date();

            date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + 540);
            Storage.Get(['time'], function (response) {
                if (response['time'] !== undefined) {
                    time = response['time'];
                    dailyReset = new Date(time.daily);
                    weeklyReset = new Date(time.weekly);
                    monthlyReset = new Date(time.monthly);
                    assaultTimes = [time['assault-0'], time['assault-1']];
                    isDefenseOrder = time['defense-active'];
                    nextDefenseOrder = new Date(time['defense-time']);
                } else {
                    Storage.Set(time);
                    newDaily();
                    newWeekly();
                    newMonthly();
                }
                populateNextAssaultTime();
                postAssaultTimeMessage();
                if (dailyReset !== null && weeklyReset !== null && monthlyReset !== null) {
                    if (Date.parse(date) >= Date.parse(dailyReset)) {

                        if (Date.parse(date) >= Date.parse(monthlyReset)) {
                            Dailies.MonthlyReset();
                            newMonthly();
                        }
                        if (Date.parse(date) >= Date.parse(weeklyReset)) {
                            Dailies.WeeklyReset();
                            newWeekly();
                        }
                        Dailies.Reset();
                        newDaily();
                    }
                }
                newDate();
                startClock();
                if (callback !== undefined) {
                    callback();
                }
            });
        },
        InitializeDev: function () {
            var response = [];
            Object.keys(timesTill).forEach(function (key) {
                response.push(createCategoryMessage(key));
            });
            Object.keys(jstTimes).forEach(function (key) {
                response.push(createCategoryMessage(key));
            });
            Object.keys(isActiveTimes).forEach(function (key) {
                response.push(createCategoryMessage(key));
            });
            postSetTimeZoneMessage();
            return response;
        },
        SetAssaultTime: function (hours) {
            saveAssaultTime(hours);
            populateNextAssaultTime();
        },
        SetDefenseOrder: function (minutes, active) {
            isDefenseOrder = active;
            if (active && minutes === -1) {
                if (nextDefenseOrder === null) {
                    newDefenseTime(29);
                }
            } else {
                newDefenseTime(minutes);
            }
        },
        SetAngelHalo: function (delta, active) {
            isAngelHalo = active;
            newAngelTime(delta);
            setDate();
        },
        ParseTime: function (diff, unit) {
            str = "";
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
        },
        UpdateAlertColor() {
            Object.keys(isActiveTimes).forEach(function (key) {
                Message.PostAll(createCategoryMessage(key));
            });
        }
    }

    var startClock = function () {
        clearInterval(clocktimer);
        clocktimer = setInterval(function () {
            date.setSeconds(date.getSeconds() + 1);
            checkNewDay();
            var now = Date.now() + (date.getTimezoneOffset() + 540) * 60000;
            if (date.getTime() - 100 <= now && date.getTime() + 100 >= now && (date.getMilliseconds() <= 100 || date.getMilliseconds() >= 900)) {
                setDate();
            } else {
                refreshClock();
            }
        }, 1000);
    }

    var refreshClock = function () {
        newDate();
        clearInterval(clocktimer);
        clocktimer = setTimeout(function () {
            date.setSeconds(date.getSeconds() + 1);
            checkNewDay();
            setDate();
            startClock();
        }, 1000 - date.getMilliseconds());
    }

    var newDate = function () {
        date = new Date();
        var curr = timeZone;
        var temp = /\((.*)\)/.exec(date.toString())[1].split(' ');
        timeZone = '';
        for (var i = 0; i < temp.length; i++) {
            timeZone += temp[i][0];
        }
        if (timeZone !== curr) {
            postSetTimeZoneMessage();
        }
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + 540);
        setDate();
    }

    var newDaily = function () {
        dailyReset = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 5, 0, 0, 0);
        if (date.getHours() >= 5) {
            dailyReset.setDate(date.getDate() + 1);
        }
        storeTime({
            'daily': Date.parse(dailyReset)
        });
    }
    var newWeekly = function () {
        weeklyReset = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 5, 0, 0, 0);
        if (date.getDay() === 0) {
            weeklyReset.setDate(date.getDate() + 1);
        } else if (date.getDay() === 1 && date.getHours() < 5) {} else {
            weeklyReset.setDate(date.getDate() + (8 - date.getDay()));
        }
        storeTime({
            'weekly': Date.parse(weeklyReset)
        });
    }
    var newMonthly = function () {
        if (date.getDate() === 1 && date.getHours() < 5) {
            monthlyReset = new Date(date.getFullYear(), date.getMonth(), 1, 5, 0, 0, 0);
        } else {
            monthlyReset = new Date(date.getFullYear(), date.getMonth() + 1, 1, 5, 0, 0, 0);
        }
        storeTime({
            'monthly': Date.parse(monthlyReset)
        });
    }

    var newDefenseTime = function (delta) {
        var tuples = {};
        if (delta !== -1) {
            nextDefenseOrder = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes() + delta, 59, 0);
            tuples['defense-active'] = isDefenseOrder;
            tuples['defense-time'] = Date.parse(nextDefenseOrder);
        } else {
            isDefenseOrder = false;
            nextDefenseOrder = null;
            tuples['defense-active'] = false;
            tuples['defense-time'] = null;
        }
    }

    var checkDefenseOrder = function () {
        if (nextDefenseOrder !== null && Date.parse(date) >= Date.parse(nextDefenseOrder)) {
            if (!isDefenseOrder && Date.parse(date) < Date.parse(nextDefenseOrder) + 1800000) {
                isDefenseOrder = true;
                newDefenseTime(29);
                return true;
            } else {
                newDefenseTime(-1);
            }
        }
        return false;
    }
    var checkNewDay = function () {
        if (Date.parse(date) >= Date.parse(nextAssaultTime) && Date.parse(date) < Date.parse(nextAssaultTime) + 3600000) {
            if (!isAssaultTime) {
                Message.Notify('Strike time has begun!', '', 'strikeTimeNotifications');
            }
            populateNextAssaultTime();
        } else if (Date.parse(date) >= Date.parse(nextAssaultTime) + 3600000) {
            populateNextAssaultTime();
        }
        if (checkDefenseOrder()) {
            Message.Notify('Defense Order has begun!', '', 'defenseOrderNotifications');
        }
        if (Date.parse(date) >= Date.parse(dailyReset)) {
            if (Date.parse(date) >= Date.parse(monthlyReset) && Date.parse(date) >= Date.parse(weeklyReset)) {
                Dailies.WeeklyReset();
                Dailies.MonthlyReset();
                newWeekly();
                newMonthly();
                Message.Notify('Monthly and weekly reset!', '', 'dailyResetNotifications');
            } else if (Date.parse(date) >= Date.parse(monthlyReset)) {
                Dailies.MonthlyReset();
                newMonthly();
                Message.Notify('Monthly reset!', '', 'dailyResetNotifications');
            } else if (Date.parse(date) >= Date.parse(weeklyReset)) {
                Dailies.WeeklyReset();
                newWeekly();
                Message.Notify('Weekly reset!', '', 'dailyResetNotifications');
            } else {
                Message.Notify('Daily reset!', '', 'dailyResetNotifications');
            }
            Dailies.Reset();
            newDaily();
            newDate();
        }
    }

    var setDate = function () {
        var str = "";
        str = Time.ParseTime(Math.abs(dailyReset - date), 'h');
        setTime('daily-time', str);
        if (str.indexOf('h') === -1) {
            setTime('is-daily', true);
        } else if (str.indexOf('h') !== -1) {
            setTime('is-daily', false);
        }

        str = Time.ParseTime(Math.abs(weeklyReset - date), 'd');
        setTime('weekly-time', str);
        if (str.indexOf('d') === -1) {
            setTime('is-weekly', true);
        } else {
            setTime('is-weekly', false);
        }

        str = Time.ParseTime(Math.abs(monthlyReset - date), 'd');
        setTime('monthly-time', str);
        if (str.indexOf('d') === -1) {
            setTime('is-monthly', true);
        } else {
            setTime('is-monthly', false);
        }

        if (nextAssaultTime !== null) {
            if (isAssaultTime) {
                setTime('is-assault', true);
            } else {
                setTime('is-assault', false);
            }
            str = Time.ParseTime(Math.abs(nextAssaultTime - date), 'h');
            setTime('assault-time', str);
        } else {
            setTime('is-assault', false);
            setTime('assault-time', '???');
        }
        if (nextDefenseOrder !== null) {
            if (isDefenseOrder) {
                setTime('is-defense', true);
            } else {
                setTime('is-defense', false);
            }
            str = Time.ParseTime(Math.abs(nextDefenseOrder - date), 'h');
            setTime('defense-time', str);
        } else {
            setTime('is-defense', false);
            setTime('defense-time', '???');
        }

        var offset = -(date.getTimezoneOffset() + 540);
        str = "";
        var str2 = "";
        var str3 = "";
        var str4 = "";
        var array = date.toDateString().split(' ');
        for (var i = 0; i < array.length; i++) {
            if (i !== 3) {
                str += array[i] + ' ';
            }
        }
        str2 = (date.getHours() % 12 || 12) + ':';
        if (date.getMinutes() < 10) {
            str2 += '0';
        }
        str2 += date.getMinutes() + ':'
        if (date.getSeconds() < 10) {
            str2 += '0';
        }
        str2 += date.getSeconds() + ' ';
        if (date.getHours() <= 11) {
            str2 += 'AM';
        } else {
            str2 += 'PM';
        }
        date.setMinutes(date.getMinutes() + offset);
        array = date.toDateString().split(' ');
        for (var i = 0; i < array.length; i++) {
            if (i !== 3) {
                str3 += array[i] + ' ';
            }
        }
        str4 = (date.getHours() % 12 || 12) + ':';
        if (date.getMinutes() < 10) {
            str4 += '0';
        }
        str4 += date.getMinutes() + ':'
        if (date.getSeconds() < 10) {
            str4 += '0';
        }
        str4 += date.getSeconds() + ' ';
        if (date.getHours() <= 11) {
            str4 += 'AM';
        } else {
            str4 += 'PM';
        }
        date.setMinutes(date.getMinutes() - offset);
        populateAndPostJstAndNormalTimeMessage('date', str, str3);
        populateAndPostJstAndNormalTimeMessage('time', str2, str4);
        if (nextDefenseOrder !== null) {
            str = TimeHelper.parseDate(nextDefenseOrder);
            nextDefenseOrder.setMinutes(nextDefenseOrder.getMinutes() + offset);
            str2 = TimeHelper.parseDate(nextDefenseOrder);
            nextDefenseOrder.setMinutes(nextDefenseOrder.getMinutes() - offset);
            populateAndPostJstAndNormalTimeMessage('defense-date', str, str2);
        } else {
            populateAndPostJstAndNormalTimeMessage('defense-date', '', '');
        }
        str = TimeHelper.parseDate(dailyReset);
        dailyReset.setMinutes(dailyReset.getMinutes() + offset);
        str2 = TimeHelper.parseDate(dailyReset);
        dailyReset.setMinutes(dailyReset.getMinutes() - offset);
        populateAndPostJstAndNormalTimeMessage('daily-date', str, str2);
        str = TimeHelper.parseDate(dailyReset);
        dailyReset.setMinutes(dailyReset.getMinutes() + offset);
        str2 = TimeHelper.parseDate(dailyReset);
        dailyReset.setMinutes(dailyReset.getMinutes() - offset);
        populateAndPostJstAndNormalTimeMessage('weekly-date', str, str2);
        str = TimeHelper.parseDate(monthlyReset);
        monthlyReset.setMinutes(monthlyReset.getMinutes() + offset);
        str2 = TimeHelper.parseDate(monthlyReset);
        monthlyReset.setMinutes(monthlyReset.getMinutes() - offset);
        populateAndPostJstAndNormalTimeMessage('monthly-date', str, str2);
    }

    var setTime = function (category, value) {
        if (timesTill[category] !== undefined && timesTill[category] !== value) {
            timesTill[category] = value;
            Message.PostAll(createCategoryMessage(category));
        } else if (isActiveTimes[category] !== undefined && isActiveTimes[category] !== value) {
            isActiveTimes[category] = value;
            Message.PostAll(createCategoryMessage(category));
        }
    }

    var storeTime = function (tuples) {
        var updated = false;
        Object.keys(tuples).forEach(function (category) {
            if (time[category] !== tuples[category]) {
                updated = true;
                time[category] = tuples[category];
            }
        });
        if (updated) {
            Storage.Set('time', time);
        }
    }

    var populateAndPostJstAndNormalTimeMessage = function (category, jstValue, normalValue) {
        if (jstTimes[category] !== undefined && normalTimes[category] !== undefined && jstTimes[category] !== jstValue) {
            jstTimes[category] = jstValue;
            normalTimes[category] = normalValue;
            Message.PostAll(createCategoryMessage(category));
        }
    }

    var postSetTimeZoneMessage = function () {
        Message.PostAll({
            setTimeZone: timeZone
        });
    }

    var createCategoryMessage = function (category) {
        if (timesTill[category] !== undefined) {
            return {
                setText: {
                    'id': '#time-' + category,
                    'value': timesTill[category]
                }
            };
        } else if (jstTimes[category] !== undefined) {
            return {
                setTime: {
                    'id': '#time-' + category,
                    'jst': jstTimes[category],
                    'normal': normalTimes[category]
                }
            };
        } else if (isActiveTimes[category] !== undefined) {
            var alert = anchiraAlert;
            var sun = anchiraSun;
            var theme = Options.Get('windowTheme');
            if (theme === 'Tiamat Night') {
                alert = nightAlert;
                sun = nightSun;
            }
            if (isActiveTimes[category] === true) {
                return {
                    setColor: {
                        'id': '#time-' + category,
                        'value': alert
                    }
                };
            } else if (isActiveTimes[category] === false) {
                return {
                    setColor: {
                        'id': '#time-' + category,
                        'value': sun
                    }
                };
            }
        }
    }

    /* Assault Time */
    var populateNextAssaultTime = function () {
        var hour = date.getHours();
        if (hour >= assaultTimes[0] && hour < assaultTimes[0] + 1) {
            isAssaultTime = true;
            nextAssaultTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), assaultTimes[0] + 1, 0, 0, 0);
        } else if (hour >= assaultTimes[1] && hour < assaultTimes[1] + 1) {
            isAssaultTime = true;
            nextAssaultTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), assaultTimes[1] + 1, 0, 0, 0);
        } else {
            isAssaultTime = false;
            if (assaultTimes[1] === -1) {
                if (assaultTimes[0] === -1) {
                    nextAssaultTime = null;
                } else {
                    nextAssaultTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), assaultTimes[0], 0, 0, 0);
                }
            } else {
                if (hour < assaultTimes[0] && hour < assaultTimes[1]) {
                    nextAssaultTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.min(assaultTimes[0], assaultTimes[1]), 0, 0, 0);
                } else if (hour > assaultTimes[0] && hour > assaultTimes[1]) {
                    nextAssaultTime = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, Math.min(assaultTimes[0], assaultTimes[1]), 0, 0, 0);
                } else {
                    nextAssaultTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.max(assaultTimes[0], assaultTimes[1]), 0, 0, 0);
                }
            }
        }
    }
    saveAssaultTime = function (hours) {
        var tuples = {};
        for (var i = 0; i < hours.length; i++) {
            assaultTimes[i] = hours[i];
            tuples['assault-' + i] = hours[i];
        }
        storeTime(tuples);
        postAssaultTimeMessage();
    }

    postAssaultTimeMessage = function () {
        for (var i = 0; i < assaultTimes.length; i++) {
            var str = '';
            var str2 = '';
            if (assaultTimes[i] !== -1) {
                var hour = assaultTimes[i];
                if (hour >= 1 && hour <= 11) {
                    str += hour + 'AM';
                } else if (hour >= 13 && hour <= 23) {
                    str += (hour - 12) + 'PM';
                } else if (hour === 0) {
                    str += '12AM';
                } else {
                    str += '12PM';
                }
                hour = assaultTimes[i] - (date.getTimezoneOffset() / 60 + 9);
                while (hour < 0) {
                    hour += 24;
                }
                while (hour > 23) {
                    hour -= 24;
                }
                if (hour >= 1 && hour <= 11) {
                    str2 += hour + 'AM';
                } else if (hour >= 13 && hour <= 23) {
                    str2 += (hour - 12) + 'PM';
                } else if (hour === 0) {
                    str2 += '12AM';
                } else {
                    str2 += '12PM';
                }
                populateAndPostJstAndNormalTimeMessage('assault-date-' + i, str, str2);
            }
        }
    }
})();