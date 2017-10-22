(function () {
    const apTracker = new ApTracker();
    const bpTracker = new BpTracker();

    window.APBP = {
        VerifyAPBP: function (json) {
            let status;
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
            let id = payload.quest_id;
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
        StartRaid: function (payload) {
            bpTracker.spendBpFromJson(payload);
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
        GetAP: function () {
            return apTracker.getCurrentAp();
        },
        SetMax: function () {
            apTracker.addAp(apTracker.getMaxAp());
            bpTracker.addBp(bpTracker.getMaxBp());
        }
    }
})();