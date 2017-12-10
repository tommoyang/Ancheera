(function () {
    const drawRupieStr = "drawRupie";
    const tweetStr = "tweet";
    const coopStr = "coop";
    const renownStr = "renown";
    const moonsStr = "moons";
    const freeSingleRollStr = "freeSingleRoll";
    const freeTenRollStr = "freeTenRoll";
    const primatchsStr = "primarchs";
    const distinctionsStr = "distinctions";
    
    let IsPlayerLevelAbove100 = false;

    let renownMax = {
        '1': 2000,
        '2': 500,
        '3': 500,
        '4': 500
    }
    let renownIncreasedMax = {
        '1': 4000,
        '2': 1000,
        '3': 1000,
        '4': 1000
    }
//http://gbf.game.mbga.jp/?opensocial_viewer_id=132334696&token=64a1af77c9143220e437#quest/index/100012/0
    let dailiesData = {
        renown: {
            '1': 2000,
            '2': 500,
            '3': 500,
            '4': 500
        },
        moons: {
            '30031': 1,
            '30032': 1,
            '30033': 1
        }
    }

    let dailies = {
        drawRupie: 101,
        tweet: true,
        freeSingleRoll: true,
        freeTenRoll: true,
        primarchs: 2,
        coop: {
            '0': {
                'raw': '',
                'quest': '???',
                'progress': '',
                'max': ''
            },
            '1': {
                'raw': '',
                'quest': '???',
                'progress': '',
                'max': ''
            },
            '2': {
                'raw': '',
                'quest': '???',
                'progress': '',
                'max': ''
            },
        },
        renown: {
            '1': 0,
            '2': 0,
            '3': 0,
            '4': 0
        },
        moons: {
            '30031': 1,
            '30032': 1,
            '30033': 1
        },
        distinctions: {
            '20411': 1,
            '20421': 1,
            '20431': 1,
            '20441': 1,
            '20451': 1,
            '20461': 1,
            '20471': 1,
            '20481': 1,
            '20491': 1,
            '20501': 1,
            '20511': 1,
            '20671': 1,
            '20681': 1,
            '20691': 1,
            '20701': 1,
            '20751': 1,
            '20761': 1
        },
    }
    let enabledDistinctionList = [];

    let primarchIds = {
        //michael
        '500871': true,
        '500881': true,
        '500891': true,
        '500901': true,
        //gabriel
        '500951': true,
        '500961': true,
        '500971': true,
        '500981': true,
        //uriel
        '500911': true,
        '500921': true,
        '500931': true,
        '500941': true,
        //raphael
        '500991': true,
        '501001': true,
        '501011': true,
        '501021': true
    }
    // let $dailiesPanel = $('#dailies-panel');
    // let $weekliesPanel = $('#weeklies-panel');
    // let $monthliesPanel = $('#monthlies-panel');

    // let $coopQuests = $dailiesPanel.find('.coop-quest');
    // let $coopProgresses = $dailiesPanel.find('.coop-progress');
    // let $drawCount = $dailiesPanel.find('#draw-count');
    // let $tweetStatus = $dailiesPanel.find('#tweet-status');

    // let $renownPanel = $weekliesPanel.find('#renown-weekly-collapse');

    // let $moonPanel = $monthliesPanel.find('#moon-monthly-collapse');

    // let $miscellaneousCollapse = $('#misc-daily-collapse');
    // let $coopCollapse = $('#coop-daily-collapse');
    // let $renownCollapse = $('#renown-weekly-collapse');
    // let $moonCollapse = $('#moon-monthly-collapse');

    // let $prestige = $('#weekly-prestige');

    // let hidePrestige = function(rank) {
    //   if(rank === null || rank < 101) {
    //     isHL = false;
    //     //$prestige.hide();
    //   } else {
    //     isHL = true;
    //     //$prestige.show();
    //   }
    //   checkRenown();
    // }


    window.Dailies = {
        Initialize: function (callback) {

            Options.Get('increasedRenownLimit', function (id, value) {
                increaseRenown(value);
                let array = [];
                Object.keys(dailies.renown).forEach(function (key) {
                    array.push([renownStr, key], dailies.renown[key]);
                });
                setDailies(array, true);
            });
            let hide = Options.Get(freeSingleRollStr, function (id, value) {
                Message.PostAll({
                    'hideObject': {
                        'id': '#dailies-freeSingleRoll-Panel',
                        'value': !value
                    }
                });
                setDailies([[freeSingleRollStr], dailies[freeSingleRollStr]], true);
            });
            Options.Get('primarchDaily', function (id, value) {
                Message.PostAll({
                    'hideObject': {
                        'id': '#dailies-primarchs-Panel',
                        'value': !value
                    }
                });
                setDailies([[primatchsStr], dailies[primatchsStr]], true);
            });
            Object.keys(dailies.distinctions).forEach(function (key) {
                Options.Get(key, function (id, value) {
                    id = id[0];
                    let index = enabledDistinctionList.indexOf(id)
                    console.log(id);
                    console.log(enabledDistinctionList);
                    if (value && index === -1) {
                        if (enabledDistinctionList.length === 0) {
                            Message.PostAll({
                                'hideObject': {
                                    'id': '#distinction-dailies',
                                    'value': false
                                }
                            });
                        }
                        enabledDistinctionList.push(id);
                        Message.PostAll({
                            'setHeight': {
                                'id': '#daily-distinction-list',
                                'value': Math.ceil(enabledDistinctionList.length / 4) * 47
                            }
                        });
                    } else if (!value && index !== -1) {
                        console.log('splicing');
                        enabledDistinctionList.splice(index, 1);
                        if (enabledDistinctionList.length === 0) {
                            Message.PostAll({
                                'hideObject': {
                                    'id': '#distinction-dailies',
                                    'value': true
                                }
                            });
                        } else {
                            Message.PostAll({
                                'setHeight': {
                                    'id': '#daily-distinction-list',
                                    'value': Math.ceil(enabledDistinctionList.length / 4) * 47
                                }
                            });
                        }
                    }
                    console.log('count: ' + enabledDistinctionList.length);
                    Message.PostAll({
                        'hideObject': {
                            'id': '#distinctions-body-' + id,
                            'value': !value
                        }
                    });
                    setDailies([[distinctionsStr, id], dailies.distinctions[id]], true);
                });
            });
            Profile.Get('level', function (value) {
                if (!IsPlayerLevelAbove100 && value >= 101) {
                    IsPlayerLevelAbove100 = true;
                    Message.PostAll({
                        'hideObject': {
                            'id': '#weekly-prestige',
                            'value': false
                        }
                    });
                }

            });
            Storage.GetMultiple(['dailies'], function (response) {

                if (response['dailies'] !== undefined) {
                    if (response['dailies'][primatchsStr] === undefined) {
                        for (let key in dailies) {
                            if (response['dailies'][key] == undefined) {
                                response['dailies'][key] = dailies[key];
                            }
                        }
                        dailies = response['dailies'];
                        Storage.Set('dailies', dailies);
                    } else {
                        dailies = response['dailies'];
                    }
                } else {
                    Storage.Set('dailies', dailies);
                }
                if (callback !== undefined) {
                    callback();
                }
            });
        },
        InitializeDev: function () {
            // Object.keys(dailies.renown).forEach(function(key) {
            //       array.push([renownStr, key], dailies.renown[key]);
            //   });
            increaseRenown(Options.Get('increasedRenownLimit'));
            Message.PostAll({
                'hideObject': {
                    'id': '#dailies-freeSingleRoll-Panel',
                    'value': !Options.Get(freeSingleRollStr)
                }
            });
            Message.PostAll({
                'hideObject': {
                    'id': '#dailies-primarchs-Panel',
                    'value': !Options.Get('primarchDaily')
                }
            });

            let response = [];
            let checking = false;
            if (enabledDistinctionList.length == 0) {
                checking = true;
            }
            Object.keys(dailies.distinctions).forEach(function (key) {
                let enabled = Options.Get(key);
                if (checking && enabled) {
                    enabledDistinctionList.push(key);
                }
                response.push({
                    'addDistinction': {
                        'id': key,
                        'amount': dailies.distinctions[key],
                        'max': '1',
                        'isEnabled': enabled
                    }
                });
            });
            response.push({
                'setHeight': {
                    'id': '#daily-distinction-list',
                    'value': Math.ceil(enabledDistinctionList.length / 4) * 47
                }
            });
            if (enabledDistinctionList.length === 0 || !IsPlayerLevelAbove100) {
                response.push({
                    'hideObject': {
                        'id': '#distinction-dailies',
                        'value': true
                    }
                });
            } else {
                response.push({
                    'hideObject': {
                        'id': '#distinction-dailies',
                        'value': false
                    }
                });
            }
            Object.keys(dailies).forEach(function (key) {
                response.push(checkCollapse([key]));
            });
            response = response.concat(recursiveSearch(dailies, []));
            response.push({
                'hideObject': {
                    'id': '#weekly-prestige',
                    'value': !IsPlayerLevelAbove100
                }
            });

            return response;
        },
        Reset: function () {
            let array = [[drawRupieStr], 101, [tweetStr], true, [freeSingleRollStr], true, [freeTenRollStr], true, [primatchsStr], 2];
            Object.keys(dailies.coop).forEach(function (key) {
                array.push([coopStr, key, 'raw'], '');
                array.push([coopStr, key, 'quest'], '???');
                array.push([coopStr, key, 'max'], '');
                array.push([coopStr, key, 'progress'], '');
            });
            Object.keys(dailies.distinctions).forEach(function (key) {
                array.push([distinctionsStr, key], 1);
            });
            setDailies(array);
            Casino.Reset();
            Quest.Reset();
        },
        WeeklyReset: function () {
            let array = [];
            Object.keys(dailies[renownStr]).forEach(function (key) {
                array.push([renownStr, key], 0);
            });
            setDailies(array);
        },
        MonthlyReset: function () {
            let array = [];
            Object.keys().forEach(function (key) {
                array.push([moonsStr, dailies[moonsStr]], dailiesData[moonsStr][key]);
            });
            setDailies(array);
            Casino.MonthlyReset();
        },
        SetDraws: function (json) {
            if (json.user_info.is_free) {
                setDailies([[drawRupieStr], 101]);
            } else {
                setDailies([[drawRupieStr], json.user_info.free_count]);
            }
        },
        DecDraws: function (json) {
            if (json.gacha[0].name === 'Rupie Draw') {
                setDailies([[drawRupieStr], dailies[drawRupieStr] - json.count]);
            }
        },
        SetCoop: function (json) {
            let description;
            let array = [];
            let key;
            for (let i = 0; i < json.daily_mission.length; i++) {
                description = json.daily_mission[i].description;
                key = '' + i;
                array.push([coopStr, key, 'raw'], description);
                array.push([coopStr, key, 'quest'], parseDescription(description));
                array.push([coopStr, key, 'max'], parseInt(json.daily_mission[i].max_progress));
                array.push([coopStr, key, 'progress'], parseInt(json.daily_mission[i].progress));
            }
            setDailies(array);
        },
        CompleteCoop: function (json) {
            if (json.url === 'coopraid') {
                let list = json.popup_data.coop_daily_mission;
                if (list.length > 0) {
                    let exists;
                    let array = [];
                    for (let i = 0; i < list.length; i++) {
                        let keys = Object.keys(dailies.coop);
                        for (let j = 0; j < keys.length; j++) {
                            key = keys[j];
                            if (dailies.coop[key].quest !== '???') {
                                if (dailies.coop[key].raw === list[i].description) {
                                    array.push([coopStr, key, 'progress'], parseInt(list[i].progress));
                                    break;
                                }
                            } else {
                                array.push([coopStr, key, 'raw'], list[i].description);
                                array.push([coopStr, key, 'quest'], parseDescription(list[i].description));
                                array.push([coopStr, key, 'max'], parseInt(list[i].max_progress));
                                array.push([coopStr, key, 'progress'], parseInt(list[i].progress));
                                break;
                            }
                        }
                    }
                    setDailies(array);
                }
            }
        },
        CompleteRaid: function (json) {
            let path;
            let id;
            let array = [];
            if (!Array.isArray(json.mbp_info) && json.mbp_info !== undefined && json.mbp_info.add_result !== undefined) {
                Object.keys(json.mbp_info.add_result).forEach(function (key) {
                    path = json.mbp_info.add_result[key];
                    id = '' + path.mbp_id;
                    array.push([renownStr, id], dailies.renown[id] + parseInt(path.add_point));
                });
            }
            setDailies(array);
        },
        CheckRenown: function (json) {
            let array = [];
            if (json.option !== undefined) {
                json = json.option;
            }
            let hash = json.mbp_limit_info['92001'].limit_info;
            Object.keys(hash).forEach(function (key) {
                array.push([renownStr, '' + hash[key].param.mbp_id], parseInt(hash[key].data.weekly.get_number));
            });
            let path = json.mbp_limit_info['92002'].limit_info['10100'];
            array.push([renownStr, '' + path.param.mbp_id], parseInt(path.data.weekly.get_number));
            setDailies(array);
        },
        CheckTweet: function (json) {
            if (json.twitter.campaign_info.is_avail_twitter !== undefined) {
                if (json.twitter.campaign_info.is_avail_twitter === true) {
                    setDailies([[tweetStr], true]);
                } else {
                    setDailies([[tweetStr], false]);
                }
            }
        },
        UseTweet: function (json) {
            if (json.reward_status === true) {
                APBP.SetMax();
                setDailies([[tweetStr], false]);
            }
        },
        PurchaseMoon: function (json) {
            let id = json.article.item_ids[0];
            if (id === '30031' || id === '30032' || id === '30033') {
                setDailies([moonsStr, id], 0);
            }
        },
        CheckMoons: function (json) {
            let id;
            let amounts = {'30031': 0, '30032': 0, '30033': 0};
            for (let i = 0; i < json.list.length; i++) {
                id = json.list[i].item_ids[0];
                if (id === '30031' || id === '30032' || id === '30033') {
                    amounts[id] = 1;
                }
            }
            Object.keys(amounts).forEach(function (key) {
                setDailies([[moonsStr, key], amounts[key]]);
            });
        },
        CheckGacha: function (json) {
            let canRoll = false;
            if (json.enable_term_free_legend !== undefined && json.enable_term_free_legend !== false) {
                canRoll = true;
            } else if (json.enable_term_free_legend_10 !== undefined && json.enable_term_free_legend_10 !== false) {
                canRoll = true;
            }
            setDailies([[freeSingleRollStr], canRoll]);
        },
        RollCampaign: function (json, header) {
            setDailies([[freeSingleRollStr], false]);
        },
        PurchaseDistinction: function (json) {
            let id = json.article.item_ids[0];
            if (dailies.distinctions[id] !== undefined) {
                setDailies([[distinctionsStr, id], 0]);
            }
        },
        SetDistinctions: function (json) {
            let keys = Object.keys(json.list);
            let ids = {};
            let first = -1;
            let last = -1;
            let found = false;
            for (let i = 0; i < keys.length; i++) {
                //if start hasn't been determined
                let id = json.list[keys[i]].item_ids[0];
                if (dailies.distinctions[id] !== undefined) {
                    ids[id] = true;
                    found = true;
                    if (first === -1) {
                        first = parseInt(id);
                    } else {
                        last = parseInt(id);
                    }
                } else {
                    if (i === 0) {
                        first = 20411;
                    } else if (i === keys.length - 1) {
                        last = 20761;
                    }
                }
            }
            if (found) {
                let distinctions = Object.keys(dailies.distinctions);
                // let start = 0;
                // if(!pre) {
                //   start = distinctions.indexOf(ids[0]);
                // }
                // let end = distinctions.length;
                let array = [];
                for (let i = 0; i < distinctions.length; i++) {
                    let id = distinctions[i];
                    if (parseInt(id) >= first && parseInt(id) <= last) {
                        if (ids[id] === undefined) {
                            array.push([distinctionsStr, id], 0);
                        }
                    }
                }
                setDailies(array);
            }
        },
        SetPrimarchs: function (json) {
            if (json.option.quest.extra_normal_quest) {
                let primarchJson = json.option.quest.extra_normal_quest.quest_list.host_group['3000'];
                setDailies([[primatchsStr], primarchJson.group_limited_count]);
            }
        },
        DecPrimarchs: function (payload) {
            if (primarchIds['' + payload.quest_id]) {
                setDailies([[primatchsStr], dailies[primatchsStr] - 1]);
            }
        }
    }
    function setDailies(array, override) {
        let category;
        let value;
        let updated = false;
        for (let i = 0; i < array.length; i += 2) {
            category = array[i];
            value = array[i + 1];
            let curr = dailies;
            let cat = category;
            for (let j = 0; j < category.length - 1; j++) {
                curr = curr[category[j]];
            }
            cat = category[category.length - 1];
            if (curr[cat] === undefined || curr[cat] !== value) {
                updated = true;
                curr[cat] = value;
                Message.PostAll(getJquery(category));
                Message.PostAll(checkCollapse(category));
            } else if (override) {
                Message.PostAll(getJquery(category));
                Message.PostAll(checkCollapse(category));
            }
        }
        if (updated) {
            Storage.Set('dailies', dailies);
        }
    }

    function checkCollapse(category) {
        let collapse = true;
        if (category[0] === drawRupieStr || category[0] === tweetStr || category[0] === freeSingleRollStr || category[0] === primatchsStr) {
            category[0] = 'misc';
            if (dailies[drawRupieStr] !== 0 || dailies[tweetStr]) {
                collapse = false;
            } else if (Options.Get(freeSingleRollStr) && dailies[freeSingleRollStr]) {
                collapse = false;
            } else if (Options.Get('primarchDaily') && dailies[primatchsStr] !== 0) {
                collapse = false;
            }
        } else if (category[0] === coopStr) {
            let coop;
            let coops = Object.keys(dailies[coopStr]);
            for (let i = 0; i < coops.length; i++) {
                coop = dailies[coopStr][coops[i]];
                if (coop.quest === '???' || coop.progress !== coop.max) {
                    collapse = false;
                    break;
                }
            }
        } else if (category[0] === renownStr) {
            let cat = category[0];
            let array = Object.keys(dailies[cat]);
            for (let i = 0; i < array.length; i++) {
                if (!(array[i] === '4' && !IsPlayerLevelAbove100) && array[i] !== '5' && array[i] !== '6') {
                    if (dailies[cat][array[i]] !== dailiesData[cat][array[i]]) {
                        collapse = false;
                        break;
                    }
                }

            }
        } else if (category[0] === moonsStr) {
            let cat = category[0];
            let array = Object.keys(dailies[cat]);
            for (let i = 0; i < array.length; i++) {
                if (dailies[cat][array[i]] === dailiesData[cat][array[i]]) {
                    collapse = false;
                    break;
                }
            }
        } else if (category[0] === distinctionsStr) {
            let cat = category[0];
            let array = Object.keys(dailies[cat]);
            for (let i = 0; i < array.length; i++) {
                if (dailies[cat][array[i]] === 1 && Options.Get(array[i])) {
                    console.log('failing collapse on: ' + dailies[cat][array[i]] + ' ' + Options.Get(array[i]));
                    collapse = false;
                    break;
                }
            }
        }
        let id = '#collapse-dailies-' + category[0];
        return {
            'collapsePanel': {
                'id': id,
                'value': collapse
            }
        };
    }
    
    //constructs 'setText' object to be passed to UI, inline comments for construct ids [MD]
    function getJquery(category) {
        let id = '#dailies'
        let value = dailies;
        let str = '';
        if (category[0] === drawRupieStr) { // dailies-drawRupie
            str += 'Rupie draws: ';
        } else if (category[0] === tweetStr) { // dailies-tweet
            str += 'Tweet refill: ';
        } else if (category[0] === freeSingleRollStr) { // dailies-freeSingleRoll
            str += 'Free Gacha Roll: ';
        } else if (category[0] === primatchsStr) { // dailies-primarchs
            str += 'Primarchs: ';
        } else if (category[0] === coopStr) { 
            // dailies-coop-0-quest, dailies-coop-0-progress
            // dailies-coop-1-quest, dailies-coop-1-progress
            // dailies-coop-2-quest, dailies-coop-2-progress
            if (category[2] === 'raw' || category[2] === 'max') {
                return undefined;
            }
        }
        for (let i = 0; i < category.length; i++) {
            // dailies-renown-1, dailies-renown-2, dailies-renown-4, dailies-renown-3
            // dailies-moons-30031, dailies-moons-30032, dailies-moons-30033
            id += '-' + category[i];
            if (value !== undefined) {
                value = value[category[i]];
            }
        }
        if (value !== undefined) {
            if (value === true) {
                str += 'Available';
            } else if (value === false) {
                str += 'Not available';
            } else {
                str += value;
            }
            if (dailiesData[category[0]] !== undefined) {
                str += '/' + dailiesData[category[0]][category[1]];
            } else if (category[0] === coopStr && value !== '' && category[2] === 'progress') {
                str += '/' + dailies[category[0]][category[1]]['max'];
            } else if (category[0] === distinctionsStr) {
                str += '/1'
            }
        }
        //console.log('setting text: ' + id + ' ' + str);
        return {
            'setText': {
                'id': id,
                'value': str
            }
        };
    }

    function recursiveSearch(category, array) {
        if (typeof category !== 'object') {
            return getJquery(array);
        } else {
            let response = [];
            Object.keys(category).forEach(function (key) {
                response = response.concat(recursiveSearch(category[key], array.concat(key)));
            })
            return response;
        }
    }

    function parseDescription(description) {
        newDescription = "";
        if (description.indexOf('stage') !== -1) {
            newDescription = "Clear " + description.substring(description.indexOf('stage') + 8, description.lastIndexOf(' ', description.lastIndexOf('time') - 2));
            if (newDescription.indexOf('(Hard)') !== -1) {
                newDescription = newDescription.replace('(Hard)', '(H' + description.charAt(12) + ').');
            } else {
                newDescription += ' (N' + description.charAt(12) + ').';
            }
        } else if (description.indexOf('in Co-Op rooms') !== -1) {
            newDescription = description.substring(0, description.indexOf('in Co-Op rooms') - 1) + '.';
        } else {
            newDescription = description;
        }
        return newDescription;
    }

    function increaseRenown(isIncreased) {
        for (let key in renownMax) {
            if (renownMax.hasOwnProperty(key)) {
                if (isIncreased) {
                    dailiesData.renown[key] = renownIncreasedMax[key];
                } else {
                    dailiesData.renown[key] = renownMax[key];
                }
            }
        }
    }
})();