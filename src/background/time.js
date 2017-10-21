(function () {
    var clocktimer = false;
    var jstDate; // Date adjusted for JST
    var dailyReset = null; // Date
    var weeklyReset = null; // Date
    var monthlyReset = null; // Date

    var isAssaultTime = false;
    var nextAssaultTime = null;
    var assaultTimes = [-1, -1];

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
        'assault-1': -1
    };

    var timesTill = {
        'daily-time': null,
        'weekly-time': null,
        'monthly-time': null,
        'assault-time': null
    };

    var jstTimes = {
        'time': null,
        'date': null,
        'daily-date': null,
        'weekly-date': null,
        'monthly-date': null,
        'assault-date-0': null
    };

    // These are the only times in here adjusted for local timezone
    var normalTimes = {
        'time': null,
        'date': null,
        'daily-date': null,
        'weekly-date': null,
        'monthly-date': null,
        'assault-date-0': null,
        'assault-date-1': null
    };

    var isActiveTimes = {
        'is-daily': false,
        'is-weekly': false,
        'is-monthly': false,
        'is-assault': false
    };

    window.Time = {
        Initialize: function (callback) {
            jstDate = TimeHelper.getJstNowDate();

            Storage.Get(['time'], function (response) {
                if (response['time'] !== undefined) {
                    time = response['time'];
                    dailyReset = new Date(time.daily);
                    weeklyReset = new Date(time.weekly);
                    monthlyReset = new Date(time.monthly);
                    assaultTimes = [time['assault-0'], time['assault-1']];
                } else {
                    Storage.Set(time);
                    populateDailyReset();
                    populateWeeklyReset();
                    populateMonthlyReset();
                }
                populateNextAssaultTime();
                postAssaultTimeMessage();
                if (dailyReset !== null && weeklyReset !== null && monthlyReset !== null) {
                    if (jstDate >= dailyReset) {

                        if (jstDate >= monthlyReset) {
                            Dailies.MonthlyReset();
                            populateMonthlyReset();
                        }
                        if (jstDate >= weeklyReset) {
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
        ParseTime: function (diff, unit) {
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
        },
        UpdateAlertColor() {
            Object.keys(isActiveTimes).forEach(function (key) {
                Message.PostAll(createCategoryMessage(key));
            });
        }
    };

    function startClock() {
        clocktimer = setInterval(function () {
            jstDate = TimeHelper.getJstNowDate();
            checkForNewDay();
            checkForAssaultTime();
            populateAndPostAll();
        }, 1000);
    }

    function populateDate() {
        var timeNow = new Date();
        var curr = timeZone;
        var temp = /\((.*)\)/.exec(timeNow.toString())[1].split(' ');
        timeZone = '';
        for (var i = 0; i < temp.length; i++) {
            timeZone += temp[i][0];
        }
        if (timeZone !== curr) {
            postSetTimeZoneMessage();
        }
        populateAndPostAll();
    }

    function populateDailyReset() {
        dailyReset = new Date(jstDate.getFullYear(), jstDate.getMonth(), jstDate.getDate(), 5, 0, 0, 0);
        if (jstDate.getHours() >= 5) {
            dailyReset.setDate(jstDate.getDate() + 1);
        }
        storeTime({
            'daily': dailyReset.getTime()
        });
    }

    function populateWeeklyReset() {
        weeklyReset = new Date(jstDate.getFullYear(), jstDate.getMonth(), jstDate.getDate(), 5, 0, 0, 0);
        if (jstDate.getDay() === 0) {
            weeklyReset.setDate(jstDate.getDate() + 1);
        } else if (jstDate.getDay() === 1 && jstDate.getHours() < 5) {} else {
            weeklyReset.setDate(jstDate.getDate() + (8 - jstDate.getDay()));
        }
        storeTime({
            'weekly': weeklyReset.getTime()
        });
    }

    function populateMonthlyReset() {
        if (jstDate.getDate() === 1 && jstDate.getHours() < 5) {
            monthlyReset = new Date(jstDate.getFullYear(), jstDate.getMonth(), 1, 5, 0, 0, 0);
        } else {
            monthlyReset = new Date(jstDate.getFullYear(), jstDate.getMonth() + 1, 1, 5, 0, 0, 0);
        }
        storeTime({
            'monthly': monthlyReset.getTime()
        });
    }

    function checkForNewDay() {
        if (jstDate >= dailyReset) {
            if (jstDate >= monthlyReset && jstDate >= weeklyReset) {
                Dailies.WeeklyReset();
                Dailies.MonthlyReset();
                populateWeeklyReset();
                populateMonthlyReset();
                Message.Notify('Monthly and weekly reset!', '', 'dailyResetNotifications');
            } else if (jstDate >= monthlyReset) {
                Dailies.MonthlyReset();
                populateMonthlyReset();
                Message.Notify('Monthly reset!', '', 'dailyResetNotifications');
            } else if (jstDate >= weeklyReset) {
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
        var dailyResetTimeTillStr = Time.ParseTime(Math.abs(dailyReset - jstDate), 'h');
        populateAndPostTimesTillMessage('daily-time', dailyResetTimeTillStr);
        if (dailyResetTimeTillStr.indexOf('h') === -1) {
            populateAndPostIsActiveTimesMessage('is-daily', true);
        } else if (dailyResetTimeTillStr.indexOf('h') !== -1) {
            populateAndPostIsActiveTimesMessage('is-daily', false);
        }

        var weeklyResetTimeTillStr = Time.ParseTime(Math.abs(weeklyReset - jstDate), 'd');
        populateAndPostTimesTillMessage('weekly-time', weeklyResetTimeTillStr);
        if (weeklyResetTimeTillStr.indexOf('d') === -1) {
            populateAndPostIsActiveTimesMessage('is-weekly', true);
        } else {
            populateAndPostIsActiveTimesMessage('is-weekly', false);
        }

        var monthlyResetTimeTillStr = Time.ParseTime(Math.abs(monthlyReset - jstDate), 'd');
        populateAndPostTimesTillMessage('monthly-time', monthlyResetTimeTillStr);
        if (monthlyResetTimeTillStr.indexOf('d') === -1) {
            populateAndPostIsActiveTimesMessage('is-monthly', true);
        } else {
            populateAndPostIsActiveTimesMessage('is-monthly', false);
        }

        var timezoneOffsetInMinutes = -(jstDate.getTimezoneOffset() + 540);
        var jstDateStr = "";
        var jstTimeStr = "";
        var localDateStr = "";
        var localTimeStr = "";
        var array = jstDate.toDateString().split(' ');
        for (var i = 0; i < array.length; i++) {
            if (i !== 3) {
                jstDateStr += array[i] + ' ';
            }
        }
        jstTimeStr = (jstDate.getHours() % 12 || 12) + ':';
        if (jstDate.getMinutes() < 10) {
            jstTimeStr += '0';
        }
        jstTimeStr += jstDate.getMinutes() + ':';
        if (jstDate.getSeconds() < 10) {
            jstTimeStr += '0';
        }
        jstTimeStr += jstDate.getSeconds() + ' ';
        if (jstDate.getHours() <= 11) {
            jstTimeStr += 'AM';
        } else {
            jstTimeStr += 'PM';
        }
        jstDate.setMinutes(jstDate.getMinutes() + timezoneOffsetInMinutes);
        array = jstDate.toDateString().split(' ');
        for (var i = 0; i < array.length; i++) {
            if (i !== 3) {
                localDateStr += array[i] + ' ';
            }
        }
        localTimeStr = (jstDate.getHours() % 12 || 12) + ':';
        if (jstDate.getMinutes() < 10) {
            localTimeStr += '0';
        }
        localTimeStr += jstDate.getMinutes() + ':';
        if (jstDate.getSeconds() < 10) {
            localTimeStr += '0';
        }
        localTimeStr += jstDate.getSeconds() + ' ';
        if (jstDate.getHours() <= 11) {
            localTimeStr += 'AM';
        } else {
            localTimeStr += 'PM';
        }
        jstDate.setMinutes(jstDate.getMinutes() - timezoneOffsetInMinutes);
        populateAndPostAbsoluteTimesMessage('date', jstDateStr, localDateStr);
        populateAndPostAbsoluteTimesMessage('time', jstTimeStr, localTimeStr);

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
    function checkForAssaultTime() {
        if (nextAssaultTime === null) {
            populateAndPostIsActiveTimesMessage('is-assault', false);
            populateAndPostTimesTillMessage('assault-time', '???');
            return;
        }

        if (jstDate >= nextAssaultTime && jstDate.getTime() < nextAssaultTime.getTime() + 3600000) {
            if (!isAssaultTime) {
                Message.Notify('Strike time has begun!', '', 'strikeTimeNotifications');
            }
            populateNextAssaultTime();
        } else if (jstDate.getTime() >= nextAssaultTime.getTime() + 3600000) {
            populateNextAssaultTime();
        }

        if (isAssaultTime) {
            populateAndPostIsActiveTimesMessage('is-assault', true);
        } else {
            populateAndPostIsActiveTimesMessage('is-assault', false);
        }
        var assaultTimeTillStr = Time.ParseTime(Math.abs(nextAssaultTime - jstDate), 'h');
        populateAndPostTimesTillMessage('assault-time', assaultTimeTillStr);
    }

    function populateNextAssaultTime() {
        var currentHour = jstDate.getHours();
        var selectedNextAssaultTimeHour;
        var selectedNextAssasultTimeDate = jstDate.getDate();
        if (currentHour >= assaultTimes[0] && currentHour < assaultTimes[0] + 1) { // During 1st assault time
            isAssaultTime = true;
            selectedNextAssaultTimeHour = assaultTimes[0] + 1;
        } else if (currentHour >= assaultTimes[1] && currentHour < assaultTimes[1] + 1) {
            isAssaultTime = true;
            selectedNextAssaultTimeHour = assaultTimes[1];
        } else {
            isAssaultTime = false;
            if (assaultTimes[1] === -1) {
                if (assaultTimes[0] === -1) {
                    nextAssaultTime = null;
                    return;
                } else {
                    selectedNextAssaultTimeHour = assaultTimes[0], 0, 0, 0;
                }
            } else {
                if (currentHour < assaultTimes[0] && currentHour < assaultTimes[1]) {
                    selectedNextAssaultTimeHour = Math.min(assaultTimes[0], assaultTimes[1]);
                } else if (currentHour > assaultTimes[0] && currentHour > assaultTimes[1]) {
                    selectedNextAssasultTimeDate = jstDate.getDate() + 1;
                    selectedNextAssaultTimeHour = Math.min(assaultTimes[0], assaultTimes[1]);
                } else {
                    selectedNextAssaultTimeHour = Math.max(assaultTimes[0], assaultTimes[1]);
                }
            }
        }

        nextAssaultTime = new Date(jstDate.getFullYear(), jstDate.getMonth(), selectedNextAssasultTimeDate, selectedNextAssaultTimeHour, 0, 0, 0);
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
            var jstAssaultTimeStr = '';
            var localAssaultTimeStr = '';
            if (assaultTimes[i] !== -1) {
                var hour = assaultTimes[i];
                if (hour >= 1 && hour <= 11) {
                    jstAssaultTimeStr += hour + 'AM';
                } else if (hour >= 13 && hour <= 23) {
                    jstAssaultTimeStr += (hour - 12) + 'PM';
                } else if (hour === 0) {
                    jstAssaultTimeStr += '12AM';
                } else {
                    jstAssaultTimeStr += '12PM';
                }
                hour = assaultTimes[i] - (jstDate.getTimezoneOffset() / 60 + 9);
                while (hour < 0) {
                    hour += 24;
                }
                while (hour > 23) {
                    hour -= 24;
                }
                if (hour >= 1 && hour <= 11) {
                    localAssaultTimeStr += hour + 'AM';
                } else if (hour >= 13 && hour <= 23) {
                    localAssaultTimeStr += (hour - 12) + 'PM';
                } else if (hour === 0) {
                    localAssaultTimeStr += '12AM';
                } else {
                    localAssaultTimeStr += '12PM';
                }
                populateAndPostAbsoluteTimesMessage('assault-date-' + i, jstAssaultTimeStr, localAssaultTimeStr);
            }
        }
    }
})();