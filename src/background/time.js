(function () {
    var clocktimer = false;
    var date; // Date adjusted for JST
    var dailyReset = null; // Date
    var weeklyReset = null; // Date
    var monthlyReset = null; // Date

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
        'daily': 0, // unix timestamp till when daily reset, should be the same as dailyReset;
        'weekly': 0, // ditto
        'monthly': 0, // ditto
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

    // These are the only times in here adjusted for local timezone
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
                    populateDailyReset();
                    populateWeeklyReset();
                    populateMonthlyReset();
                }
                populateNextAssaultTime();
                postAssaultTimeMessage();
                if (dailyReset !== null && weeklyReset !== null && monthlyReset !== null) {
                    if (Date.parse(date) >= Date.parse(dailyReset)) {

                        if (Date.parse(date) >= Date.parse(monthlyReset)) {
                            Dailies.MonthlyReset();
                            populateMonthlyReset();
                        }
                        if (Date.parse(date) >= Date.parse(weeklyReset)) {
                            Dailies.WeeklyReset();
                            populateWeeklyReset();
                        }
                        Dailies.Reset();
                        populateDailyReset();
                    }
                }
                populateDate();
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
                    populateDefenseTimes(29);
                }
            } else {
                populateDefenseTimes(minutes);
            }
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

    function startClock() {
        clearInterval(clocktimer);
        clocktimer = setInterval(function () {
            date.setSeconds(date.getSeconds() + 1);
            checkNewDay();
            var now = Date.now() + (date.getTimezoneOffset() + 540) * 60000;
            if (date.getTime() - 100 <= now && date.getTime() + 100 >= now && (date.getMilliseconds() <= 100 || date.getMilliseconds() >= 900)) {
                populateAndPostAll();
            } else {
                refreshClock();
            }
        }, 1000);
    }

    function refreshClock() {
        populateDate();
        clearInterval(clocktimer);
        clocktimer = setTimeout(function () {
            date.setSeconds(date.getSeconds() + 1);
            checkNewDay();
            populateAndPostAll();
            startClock();
        }, 1000 - date.getMilliseconds());
    }

    function populateDate() {
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
        populateAndPostAll();
    }

    function populateDailyReset() {
        dailyReset = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 5, 0, 0, 0);
        if (date.getHours() >= 5) {
            dailyReset.setDate(date.getDate() + 1);
        }
        storeTime({
            'daily': Date.parse(dailyReset)
        });
    }

    function populateWeeklyReset() {
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

    function populateMonthlyReset() {
        if (date.getDate() === 1 && date.getHours() < 5) {
            monthlyReset = new Date(date.getFullYear(), date.getMonth(), 1, 5, 0, 0, 0);
        } else {
            monthlyReset = new Date(date.getFullYear(), date.getMonth() + 1, 1, 5, 0, 0, 0);
        }
        storeTime({
            'monthly': Date.parse(monthlyReset)
        });
    }

    function populateDefenseTimes(delta) {
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

    function checkDefenseOrder() {
        if (nextDefenseOrder !== null && Date.parse(date) >= Date.parse(nextDefenseOrder)) {
            if (!isDefenseOrder && Date.parse(date) < Date.parse(nextDefenseOrder) + 1800000) {
                isDefenseOrder = true;
                populateDefenseTimes(29);
                return true;
            } else {
                populateDefenseTimes(-1);
            }
        }
        return false;
    }

    function checkNewDay() {
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
                populateWeeklyReset();
                populateMonthlyReset();
                Message.Notify('Monthly and weekly reset!', '', 'dailyResetNotifications');
            } else if (Date.parse(date) >= Date.parse(monthlyReset)) {
                Dailies.MonthlyReset();
                populateMonthlyReset();
                Message.Notify('Monthly reset!', '', 'dailyResetNotifications');
            } else if (Date.parse(date) >= Date.parse(weeklyReset)) {
                Dailies.WeeklyReset();
                populateWeeklyReset();
                Message.Notify('Weekly reset!', '', 'dailyResetNotifications');
            } else {
                Message.Notify('Daily reset!', '', 'dailyResetNotifications');
            }
            Dailies.Reset();
            populateDailyReset();
            populateDate();
        }
    }

    function populateAndPostAll() {
        var dailyResetTimeTillStr = Time.ParseTime(Math.abs(dailyReset - date), 'h');
        populateAndPostTimesTillMessage('daily-time', dailyResetTimeTillStr);
        if (dailyResetTimeTillStr.indexOf('h') === -1) {
            populateAndPostIsActiveTimesMessage('is-daily', true);
        } else if (dailyResetTimeTillStr.indexOf('h') !== -1) {
            populateAndPostIsActiveTimesMessage('is-daily', false);
        }

        var weeklyResetTimeTillStr = Time.ParseTime(Math.abs(weeklyReset - date), 'd');
        populateAndPostTimesTillMessage('weekly-time', weeklyResetTimeTillStr);
        if (weeklyResetTimeTillStr.indexOf('d') === -1) {
            populateAndPostIsActiveTimesMessage('is-weekly', true);
        } else {
            populateAndPostIsActiveTimesMessage('is-weekly', false);
        }

        var monthlyResetTimeTillStr = Time.ParseTime(Math.abs(monthlyReset - date), 'd');
        populateAndPostTimesTillMessage('monthly-time', monthlyResetTimeTillStr);
        if (monthlyResetTimeTillStr.indexOf('d') === -1) {
            populateAndPostIsActiveTimesMessage('is-monthly', true);
        } else {
            populateAndPostIsActiveTimesMessage('is-monthly', false);
        }

        if (nextAssaultTime !== null) {
            if (isAssaultTime) {
                populateAndPostIsActiveTimesMessage('is-assault', true);
            } else {
                populateAndPostIsActiveTimesMessage('is-assault', false);
            }
            var assaultTimeTillStr = Time.ParseTime(Math.abs(nextAssaultTime - date), 'h');
            populateAndPostTimesTillMessage('assault-time', assaultTimeTillStr);
        } else {
            populateAndPostIsActiveTimesMessage('is-assault', false);
            populateAndPostTimesTillMessage('assault-time', '???');
        }
        if (nextDefenseOrder !== null) {
            if (isDefenseOrder) {
                populateAndPostIsActiveTimesMessage('is-defense', true);
            } else {
                populateAndPostIsActiveTimesMessage('is-defense', false);
            }
            var defenseOrderTimeTillStr = Time.ParseTime(Math.abs(nextDefenseOrder - date), 'h');
            populateAndPostTimesTillMessage('defense-time', defenseOrderTimeTillStr);
        } else {
            populateAndPostIsActiveTimesMessage('is-defense', false);
            populateAndPostTimesTillMessage('defense-time', '???');
        }

        var timezoneOffsetInMinutes = -(date.getTimezoneOffset() + 540);
        var jstDateStr = "";
        var jstTimeStr = "";
        var localDateStr = "";
        var localTimeStr = "";
        var array = date.toDateString().split(' ');
        for (var i = 0; i < array.length; i++) {
            if (i !== 3) {
                jstDateStr += array[i] + ' ';
            }
        }
        jstTimeStr = (date.getHours() % 12 || 12) + ':';
        if (date.getMinutes() < 10) {
            jstTimeStr += '0';
        }
        jstTimeStr += date.getMinutes() + ':'
        if (date.getSeconds() < 10) {
            jstTimeStr += '0';
        }
        jstTimeStr += date.getSeconds() + ' ';
        if (date.getHours() <= 11) {
            jstTimeStr += 'AM';
        } else {
            jstTimeStr += 'PM';
        }
        date.setMinutes(date.getMinutes() + timezoneOffsetInMinutes);
        array = date.toDateString().split(' ');
        for (var i = 0; i < array.length; i++) {
            if (i !== 3) {
                localDateStr += array[i] + ' ';
            }
        }
        localTimeStr = (date.getHours() % 12 || 12) + ':';
        if (date.getMinutes() < 10) {
            localTimeStr += '0';
        }
        localTimeStr += date.getMinutes() + ':'
        if (date.getSeconds() < 10) {
            localTimeStr += '0';
        }
        localTimeStr += date.getSeconds() + ' ';
        if (date.getHours() <= 11) {
            localTimeStr += 'AM';
        } else {
            localTimeStr += 'PM';
        }
        date.setMinutes(date.getMinutes() - timezoneOffsetInMinutes);
        populateAndPostAbsoluteTimesMessage('date', jstDateStr, localDateStr);
        populateAndPostAbsoluteTimesMessage('time', jstTimeStr, localTimeStr);
        if (nextDefenseOrder !== null) {
            var nextDefenseOrderJstDateStr = TimeHelper.parseDate(nextDefenseOrder);
            nextDefenseOrder.setMinutes(nextDefenseOrder.getMinutes() + timezoneOffsetInMinutes);
            var nextDefenseOrderLocalDateStr = TimeHelper.parseDate(nextDefenseOrder);
            nextDefenseOrder.setMinutes(nextDefenseOrder.getMinutes() - timezoneOffsetInMinutes);
            populateAndPostAbsoluteTimesMessage('defense-date', nextDefenseOrderJstDateStr, nextDefenseOrderLocalDateStr);
        } else {
            populateAndPostAbsoluteTimesMessage('defense-date', '', '');
        }
        var dailyResetJstStr = TimeHelper.parseDate(dailyReset);
        dailyReset.setMinutes(dailyReset.getMinutes() + timezoneOffsetInMinutes);
        var dailyResetLocalStr = TimeHelper.parseDate(dailyReset);
        dailyReset.setMinutes(dailyReset.getMinutes() - timezoneOffsetInMinutes);
        populateAndPostAbsoluteTimesMessage('daily-date', dailyResetJstStr, dailyResetLocalStr);

        var weeklyResetJstStr = TimeHelper.parseDate(weeklyReset);
        weeklyReset.setMinutes(weeklyReset.getMinutes() + timezoneOffsetInMinutes);
        var weeklyResetLocalStr = TimeHelper.parseDate(weeklyReset);
        weeklyReset.setMinutes(weeklyReset.getMinutes() - timezoneOffsetInMinutes);
        populateAndPostAbsoluteTimesMessage('weekly-date', weeklyResetJstStr, weeklyResetLocalStr);

        var monthlyResetJstStr = TimeHelper.parseDate(monthlyReset);
        monthlyReset.setMinutes(monthlyReset.getMinutes() + timezoneOffsetInMinutes);
        var monthlyResetLocalStr = TimeHelper.parseDate(monthlyReset);
        monthlyReset.setMinutes(monthlyReset.getMinutes() - timezoneOffsetInMinutes);
        populateAndPostAbsoluteTimesMessage('monthly-date', monthlyResetJstStr, monthlyResetLocalStr);
    }

    function populateAndPostIsActiveTimesMessage(category, value) {
        if (isActiveTimes[category] !== undefined && isActiveTimes[category] !== value) {
            isActiveTimes[category] = value;
            Message.PostAll(createCategoryMessage(category));
        }
    }

    function populateAndPostTimesTillMessage(category, value) {
        if (timesTill[category] !== undefined && timesTill[category] !== value) {
            timesTill[category] = value;
            Message.PostAll(createCategoryMessage(category));
        }
    }

    function storeTime(tuples) {
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

    function populateAndPostAbsoluteTimesMessage(category, jstValue, normalValue) {
        if (jstTimes[category] !== undefined && normalTimes[category] !== undefined && jstTimes[category] !== jstValue) {
            jstTimes[category] = jstValue;
            normalTimes[category] = normalValue;
            Message.PostAll(createCategoryMessage(category));
        }
    }

    function postSetTimeZoneMessage() {
        Message.PostAll({
            setTimeZone: timeZone
        });
    }

    function createCategoryMessage(category) {
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
    function populateNextAssaultTime() {
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

    function saveAssaultTime(hours) {
        var tuples = {};
        for (var i = 0; i < hours.length; i++) {
            assaultTimes[i] = hours[i];
            tuples['assault-' + i] = hours[i];
        }
        storeTime(tuples);
        postAssaultTimeMessage();
    }

    function postAssaultTimeMessage() {
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
                populateAndPostAbsoluteTimesMessage('assault-date-' + i, str, str2);
            }
        }
    }
})();