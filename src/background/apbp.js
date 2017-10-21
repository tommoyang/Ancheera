(function () {
    var apTracker = new ApTracker();
    var bpTracker = new BpTracker();

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
                bpTracker.updateFromJson(status);
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
            bpTracker.stageRaidFromJson(json);
        },
        InitializeRaidCode: function (json) {
            bpTracker.stageRaidCodeFromJson(json);
        },

        StartRaid: function (json, payload) {
            bpTracker.spendBpOnStagedRaid(json, payload)
            apTracker.stageQuest(0);
        },
        RestoreAPBP: function (json) {
            if (json.result !== undefined && json.result.recovery_str !== undefined) {
                if (json.result.recovery_str === "AP") {
                    apTracker.addAp(json.result.after - json.result.before);
                } else if (json.result.recovery_str === "EP") {
                    bpTracker.addBp(json.result.after - json.result.before);
                }
            }
        },
        GetAP: function (response) {
            return apTracker.getCurrentAp();
        },
        SetMax: function () {
            apTracker.addAp(apTracker.getMaxAp());
            bkTracker.addBP(bpTracker.getMaxBp());
        }
    }

    var addAP = function (amount) {
        apTracker.addAp(amount);
    }

    var spendBP = function (amount) {
        bpTracker.spendBp(amount);
    }

    var setBP = function (current, max) {
        bpTracker.setBp(current, max);
    }

    var addBP = function (amount) {
        bpTracker.addBp(amount);
    }

    var setAP = function (curr, max) {
        apTracker.setAp(curr, max);
    }

    var setAPTime = function () {
        apTracker.setApTime();
    }
    var setBPTime = function () {
        bpTracker.setBpTime();
    }
})();