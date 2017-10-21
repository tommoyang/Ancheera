(function () {
    var apTracker = new ApTracker();

    var currBP = 0;
    var maxBP = 0;

    var bpTime = {
        hour: 0,
        minute: 0,
        second: 0
    };

    var bpTimer;
    var availableRaids = {};
    var currRaids = {};
    var decBP = 0;

    window.APBP = {
        VerifyAPBP: function (json) {
            var status;
            if (json.status !== undefined) {
                status = json.status;
            } else if (json.mydata !== undefined) {
                status = json.mydata.status;
            } else if (json.option !== undefined) {
                if (json.option.mydata_assets !== undefined && json.option.mydata_assets.mydata !== undefined) {
                    status = json.option.mydata_assets.mydata.status;
                } else if (json.option.user_status !== undefined) {
                    status = json.option.user_status;
                }
            }
            if (status !== undefined) {
                apTracker.updateFromJson(status);
                setBP(status.bp, status.max_battle_point);
                if (status.battle_point_remain.indexOf('00:00') === -1) {
                    index = status.battle_point_remain.indexOf('h');
                    hour = bpTime.hour;
                    minute = bpTime.minute;
                    if (index !== -1) {
                        bpTime.hour = Number(status.battle_point_remain.substring(0, index));
                    } else {
                        bpTime.hour = 0;
                    }
                    if (status.battle_point_remain.indexOf('m') !== -1) {
                        bpTime.minute = Number(status.battle_point_remain.substring(index + 1, status.battle_point_remain.length - 1));
                    } else {
                        bpTime.minute = 0;
                    }
                    if (hour !== bpTime.hour || minute !== bpTime.minute) {
                        bpTime.second = 59;
                        setBPTime();
                        resetBPTimer();
                    }
                } else {
                    stopBPTimer();
                }
            }
        },

        InitializeQuest: function (json) {
            apTracker.stageQuest(json.action_point);
        },

        StartQuest: function (json, payload) {
            var id = payload.quest_id;
            if (id == 715571 || id == 715561 || id == 715551) {
                apTracker.stageQuest(50);
            } else if (id == 715541) {
                apTracker.stageQuest(30);
            } else if (id == 715531) {
                apTracker.stageQuest(25);
            } else if (id == 715521) {
                apTracker.stageQuest(15);
            } else if (id == 715511) {
                apTracker.stageQuest(10);
            }
            if (json.result !== undefined && json.result === 'ok') {
                apTracker.spendApOnStagedQuest();
                apTracker.stageQuest(0);
            }
        },

        InitializeRaid: function (json) {
            availableRaids = {};
            var raid;
            for (var i = 0; i < json.assist_raids_data.length; i++) {
                raid = json.assist_raids_data[i];
                availableRaids[raid.raid.id] = {
                    bp: raid.used_battle_point
                };
            }
        },
        InitializeRaidCode: function (json) {
            availableRaids = {};
            availableRaids[json.raid.id] = {
                bp: json.used_battle_point
            };
        },

        StartRaid: function (json, payload) {
            if (json.result !== false) {
                if (json.is_host === false) {
                    spendBP(parseInt(payload.select_bp));
                }
                currRaids[json.raid_id] = availableRaids[json.raid_id];
            }
            availableRaids = {};
            apTracker.stageQuest(0);
        },
        RestoreAPBP: function (json) {
            if (json.result !== undefined && json.result.recovery_str !== undefined) {
                if (json.result.recovery_str === "AP") {
                    apTracker.addAp(json.result.after - json.result.before);
                } else if (json.result.recovery_str === "EP") {
                    apTracker.addAp(json.result.after - json.result.before);
                }
            }
        },
        GetAP: function (response) {
            return apTracker.getCurrentAp();
        },
        SetMax: function () {
            apTracker.addAp(apTracker.getMaxAp());
            addBP(maxBP);
        }
    }

    var addAP = function (amount) {
        apTracker.addAp(amount);
    }

    var spendBP = function (amt) {
        var full = false;
        if (currBP >= maxBP) {
            full = true;
            setBP(currBP - amt, maxBP);
            if (currBP < maxBP) {
                amt = maxBP - currBP;
            } else {
                return;
            }
        } else {
            setBP(currBP - amt, maxBP);
        }
        if (currBP < maxBP) {
            bpTime.minute += amt * 10 % 60;
            if (bpTime.minute >= 60) {
                bpTime.minute -= 60;
                bpTime.hour++;
            }
            if (full) {
                bpTime.minute--;
                if (bpTime.minute < 0) {
                    bpTime.minute += 60;
                    bpTime.hour--;
                }
                bpTime.second = 59;
            }
            bpTime.hour += Math.floor(amt * 10 / 60);
            setBPTime();
            if (!bpTimer) {
                resetBPTimer();
            }
        }
    }

    var setBP = function (curr, max) {
        currBP = parseInt(curr);
        maxBP = parseInt(max);
        Message.PostAll({
            setText: {
                'id': '#bp-number',
                'value': 'EP: ' + currBP + '/' + maxBP
            }
        });
        Message.PostAll({
            setBar: {
                'id': '#bp-bar',
                'value': ((currBP / maxBP) * 100) + '%'
            }
        });
    }

    var addBP = function (amt) {
        setBP(currBP + amt, maxBP);
        if (currBP >= maxBP) {
            stopBPTimer();
        } else {
            bpTime.minute -= amt * 10 % 60;
            if (bpTime.minute < 0) {
                bpTime.minute += 60;
                bpTime.hour--;
            }
            bpTime.hour -= Math.floor(amt * 10 / 60);
            setBPTime();
        }
    }

    var setAP = function (curr, max) {
        apTracker.setAp(curr, max);
    }

    var setAPTime = function () {
        apTracker.setApTime();
    }
    var setBPTime = function () {
        var str = "";
        if (bpTime.hour > 0) {
            str += bpTime.hour + ':';
            if (bpTime.minute < 10) {
                str += '0'
            }
        }
        if (bpTime.minute > 0 || (bpTime.minute == 0 && bpTime.hour > 0)) {
            str += bpTime.minute + ':';
            if (bpTime.second < 10) {
                str += '0';
            }
        }
        str += bpTime.second;
        if (parseInt(str) <= 0) {
            str = "";
        }
        Message.PostAll({
            setText: {
                'id': '#bp-time',
                'value': str
            }
        });
    }

    var resetBPTimer = function () {
        clearInterval(bpTimer);
        bpTimer = setInterval(function () {
            bpTime.second--;
            if (bpTime.second < 0) {
                bpTime.minute--;
                if (bpTime.minute < 0) {
                    bpTime.hour--;
                    if (bpTime.hour < 0) {
                        setBP(currBP + 1, maxBP);
                        stopBPTimer();
                        setBPTime();
                        Message.Notify('Your EP is full!', currBP + '/' + maxBP + ' EP', 'epNotifications');
                        return;
                    }
                    bpTime.minute = 59;
                }
                if ((bpTime.minute === 19 || bpTime.minute === 39 || bpTime.minute === 59) && !(bpTime.hour === Math.floor((maxBP * 10 - 1) / 60) && bpTime.minute === (maxBP * 10 - 1) % 60)) {
                    setBP(currBP + 1, maxBP);
                }
                bpTime.second = 59;
            }
            setBPTime();
        }, 1000);
    }
    var stopBPTimer = function () {
        bpTime.second = 0;
        bpTime.minute = 0;
        bpTime.hour = 0;
        clearInterval(bpTimer);
        bpTimer = false;
        setBPTime();
    }
})();