(function () {
    var supplies = {
        treasureHash: {},
        recovery: {},
        powerUp: {},
        treasure: {},
        raid: {},
        material: {},
        event: {},
        coop: {},
        misc: {},
        draw: {},
        other: {}
    };

    var responseList = {};
    var planners = {
        current: null,
    };

    var filter = 'all';
    var search = '';
    var nextUncap = null;
    var nextNpcUncap = null;

    window.Supplies = {
        Initialize: function (callback) {
            var categories = ['supplyrecovery', 'supplypowerUp', 'supplytreasure', 'supplyraid', 'supplymaterial', 'supplyevent', 'supplycoop', 'supplymisc', 'supplydraw'];
            Storage.GetMultiple(categories, function (response) {
                var category;
                for (var i = 0; i < categories.length; i++) {
                    category = categories[i].replace('supply', '');
                    if (response[categories[i]] !== undefined) {
                        var hash = response[categories[i]].supplies;
                        for (var key in hash) {
                            if (hash.hasOwnProperty(key)) {
                                newSupply(key, category, hash[key].count, hash[key].name, hash[key].sequence);
                            }
                        }
                    }
                }
                if (callback !== undefined) {
                    callback();
                }
            });
            Storage.GetMultiple(['planners'], function (response) {
                if (response['planners'] !== undefined) {
                    planners = response['planners'].planners
                }
            });
        },
        InitializeDev: function () {
            var response = [];
            var item;
            Object.keys(supplies).forEach(function (category) {
                if (category !== 'treasureHash') {
                    Object.keys(supplies[category]).forEach(function (id) {
                        item = supplies[category][id];
                        response.push({
                            addItem: {
                                'id': id,
                                'category': category,
                                'number': item.count,
                                'name': item.name,
                                'sequence': item.sequence,
                                'tooltip': createTooltip(item.name)
                            }
                        });
                    });
                }
            });
            var type = planners.current;
            if (type && planners[type]) {
                response.push({'setPlannerDropdowns': {type: type, build: planners[type]}});
                response.push({'generatePlanner': buildWeapon(type, planners[type])})
            }
            return response;
        },
        Get: function (id, category, response) {
            if (response !== undefined) {
                if (responseList[category] === undefined) {
                    responseList[category] = {};
                }
                if (responseList[category][id] === undefined) {
                    responseList[category][id] = [];
                }
                responseList[category][id].push(response);
                if (supplies[category][id] !== undefined) {
                    response(id, supplies[category][id].count);
                } else {
                    response(id, 0);
                }
            }

            if (supplies[category][id] !== undefined) {
                return supplies[category][id].count;
            }
            return 0;
        },
        Set: function (id, item_kind, amount) {
            var category = getCategory(id, item_kind);
            if (category !== undefined) {
                updateSupply(id, category, amount);
            }
        },
        Increment: function (id, item_kind, amount) {
            var category = getCategory(id, item_kind);
            if (category !== undefined) {
                updateSupply(id, category, supplies[category][id].count + amount);
            }
        },
        SetRecovery: function (json) {
            if (json !== undefined) {
                var updated = false;
                var id;
                for (var i = 0; i < json.length; i++) {
                    id = json[i].item_id;
                    if (supplies.recovery[id] !== undefined) {
                        if (updateSupply(id, 'recovery', json[i].number)) {
                            updated = true;
                        }
                    } else {
                        updated = newSupply(id, 'recovery', json[i].number, json[i].name, id);
                    }
                }
                if (updated) {
                    saveSupply('recovery');
                }
            }
        },
        SetPowerUp: function (json) {
            if (json !== undefined) {
                var updated = false;
                var id;
                for (var i = 0; i < json.items.length; i++) {
                    id = json.items[i].item_id;
                    if (supplies.powerUp[id] !== undefined) {
                        if (updateSupply(id, 'powerUp', json.items[i].number)) {
                            updated = true;
                        }
                    } else {
                        updated = newSupply(id, 'powerUp', json.items[i].number, json.items[i].name, '' + (100000 + parseInt(id)));
                    }
                }
                if (updated) {
                    saveSupply('powerUp');
                }
            }
        },
        SetTreasure: function (json) {
            if (json !== undefined) {
                var categories = ['treasure', 'raid', 'material', 'event', 'coop', 'misc'];
                var updated = {
                    'treasure': false,
                    'raid': false,
                    'material': false,
                    'event': false,
                    'coop': false,
                    'misc': false
                };
                var id;
                var category;

                for (var i = 0; i < json.length; i++) {
                    id = json[i].item_id;
                    var seq_id = parseInt(json[i].seq_id);
                    if (seq_id < 100001) {
                        category = 'treasure';
                    } else if (seq_id < 200001) {
                        category = 'raid';
                    } else if (seq_id < 300001) {
                        category = 'material';
                    } else if (seq_id < 500001) {
                        category = 'event';
                    } else if (seq_id < 600001) {
                        category = 'coop';
                    } else {
                        category = 'misc';
                    }
                    if (supplies[category][id] !== undefined) {
                        if (updateSupply(id, category, json[i].number)) {
                            updated[category] = true;
                        }
                    } else {
                        updated[category] = newSupply(id, category, json[i].number, json[i].name, seq_id);
                    }
                }
                for (var i = 0; i < categories.length; i++) {
                    if (updated[categories[i]]) {
                        saveSupply(categories[i]);
                    }
                }
            }
        },
        SetDraw: function (json) {
            if (json !== undefined) {
                var updated = false;
                var id;
                for (var i = 0; i < json.length; i++) {
                    id = json[i].item_id;
                    if (supplies.draw[id] !== undefined) {
                        if (updateSupply(id, 'draw', json[i].number)) {
                            updated = true;
                        }
                    } else {
                        updated = newSupply(id, 'draw', json[i].number, json[i].name, '' + (200000 + parseInt(id)));
                    }
                }
                if (updated) {
                    saveSupply('draw');
                }
            }
        },
        GetLoot: function (json) {
            var item;
            var updated = [];
            var list = json.rewards.reward_list;
            for (var property in list) {
                if (list.hasOwnProperty(property)) {
                    for (var i = 0; i < list[property].length; i++) {
                        item = list[property][i];
                        category = getCategory(item.id, item.item_kind);
                        if (category !== undefined && incrementSupply(item.id, category, 1)) {
                            if (updated.indexOf(category) === -1) {
                                updated.push(category);
                            }
                        }
                    }
                }
            }
            list = json.rewards.article_list;
            for (var property in list) {
                if (list.hasOwnProperty(property)) {
                    item = list[property];
                    category = getCategory(item.id, '' + item.kind);
                    if (category !== undefined && incrementSupply(item.id, category, item.count)) {
                        if (updated.indexOf(category) === -1) {
                            updated.push(category);
                        }
                    }
                }
            }
            for (var i = 0; i < updated.length; i++) {
                saveSupply(updated[i]);
            }
        },
        GetGift: function (json) {
            var id = json.item_id;
            var category = getCategory(id, json.item_kind_id);
            if (category !== undefined && incrementSupply(id, category, parseInt(json.number))) {
                saveSupply(category);
            }
        },
        GetAllGifts: function (json) {
            var item;
            var category;
            var updated = [];
            for (var i = 0; i < json.presents.length; i++) {
                item = json.presents[i];
                category = getCategory(item.item_id, item.item_kind_id);
                if (category !== undefined && incrementSupply(item.item_id, category, parseInt(item.number))) {
                    if (updated.indexOf(category) === -1) {
                        updated.push(category);
                    }
                }
            }
            for (var i = 0; i < updated.length; i++) {
                saveSupply(updated[i]);
            }
        },
        PurchaseItem: function (json) {
            if (json.article.item_ids.length > 0 && json.article.is_get.result) {
                var updated = [];
                var id = json.article.item_ids[0];
                var category = getCategory(id, json.article.item_kind[0]);
                if (category !== undefined && updateSupply(id, category, parseInt(json.article.is_get.item_cnt) + parseInt(json.purchase_number))) {
                    if (updated.indexOf(category) === -1) {
                        updated.push(category);
                    }
                }
                var article;
                var articleNumber;
                for (var i = 0; i < 4; i++) {
                    article = json.article['article' + ('' + i)];
                    articleNumber = json.article['article' + ('' + i) + '_number'];
                    if (article !== '' && articleNumber !== '' && article !== undefined && article.master !== undefined) {
                        id = article.master.id;
                        category = getCategory(id, '10');
                        if (category !== undefined && updateSupply(id, category, parseInt(article.has_number) - parseInt(articleNumber) * parseInt(json.purchase_number))) {
                            if (updated.indexOf(category) === -1) {
                                updated.push(category);
                            }
                        }
                    }
                }
                for (var i = 0; i < updated.length; i++) {
                    saveSupply(updated[i]);
                }
            }
        },
        UseRecovery: function (json, payload) {
            if (json.success && json.result.use_flag) {
                var id = payload.item_id.toString();
                incrementSupply(id, 'recovery', -payload.num);
            }
        },
        SellCoop: function (json, payload) {
            if (json.success) {
                var id = payload.item_id;
                var amt = parseInt(payload.number);
                incrementSupply(id, 'coop', -amt);
                saveSupply('coop');
                var lupi;
                switch (id) {
                    //bronze
                    case '20001':
                        lupi = 50;
                        break;
                    //silver
                    case '20002':
                        lupi = 300;
                        break;
                    //gold
                    case '20003':
                        lupi = 1000;
                        break;
                    case '20111':
                    case '20121':
                    case '20131':
                    case '20141':
                        lupi = 5000;
                        break;
                }
                Profile.AddLupi(lupi * amt);
            }
        },

        RaidTreasureInfo: function (json) {
            var updated = [];
            var id;
            var category;
            for (var i = 0; i < json.treasure_id.length; i++) {
                id = json.treasure_id[i];
                category = getCategory(id, '10');
                if (category !== undefined && updateSupply(id, category, json.num[i])) {
                    if (updated.indexOf(category) === -1) {
                        updated.push(category);
                    }
                }
            }
            for (var i = 0; i < updated.length; i++) {
                saveSupply(updated[i]);
            }
        },

        BuyCasino: function (json, payload) {
            var id = json.article.item_ids[0];
            var category = getCategory(id, json.article.item_kind[0]);
            if (incrementSupply(id, category, parseInt(payload.num))) {
                saveSupply();
            }
        },
        CheckUncapItem: function (json) {
            var updated = false;
            var item;
            for (var i = 0; i < json.items.length; i++) {
                item = json.items[i];
                if (updateSupply(item.item_id, 'powerUp', item.number)) {
                    updated = true;
                }
            }
            if (updated) {
                saveSupply('powerUp');
            }
        },
        SetUncapItem: function (json) {
            nextUncap = json.item_id;

        },
        SetUncap: function () {
            nextUncap = null;
        },
        Uncap: function () {
            if (nextUncap !== null && nextUncap !== undefined) {
                incrementSupply(nextUncap, 'powerUp', -1);
            }
        },
        SetNpcUncap: function (json) {
            nextNpcUncap = [];
            var updated = [];
            var item;
            var category;
            for (var i = 0; i < json.requirements.length; i++) {
                item = json.requirements[i];
                nextNpcUncap.push({
                    id: item.item_id,
                    item_kind: item.item_kind.id,
                    cost: item.item_number,
                });
                category = getCategory(item.item_id, item.item_kind.id);
                if (category !== undefined && updateSupply(item.item_id, category, parseInt(item.item_possessed))) {
                    if (updated.indexOf(category) === -1) {
                        updated.push(category);
                    }
                }
            }
            for (var i = 0; i < updated.length; i++) {
                saveSupply(updated[i]);
            }
        },
        NpcUncap: function () {
            var updated = [];
            var category;
            for (var i = 0; i < nextNpcUncap.length; i++) {
                category = getCategory(nextNpcUncap[i].id, nextNpcUncap[i].item_kind);
                incrementSupply(nextNpcUncap[i].id, category, -nextNpcUncap[i].cost);
                if (updated.indexOf(category) === -1) {
                    updated.push(category);
                }
            }
            for (var i = 0; i < updated.length; i++) {
                saveSupply(updated[i]);
            }
        },

        BuildWeapon: function (devID, weaponBuild) {
            planners[weaponBuild.type] = weaponBuild.build;
            planners.current = weaponBuild.type;
            savePlanner();
            Message.Post(devID, {'generatePlanner': buildWeapon(weaponBuild.type, weaponBuild.build)});
        },

        GetPlanner: function (devID, type) {
            if (type && planners[type]) {
                Message.Post(devID, {'setPlannerDropdowns': {type: type, build: planners[type]}});
                Message.Post(devID, {'generatePlanner': buildWeapon(type, planners[type])});
            }
        }
    };

    var getCategory = function (id, item_kind) {
        if (item_kind === '4') {
            return 'recovery';
        } else if (item_kind === '8') {
            return 'draw';
        } else if (item_kind === '17') {
            return 'powerUp';
        } else if (item_kind === '10') {
            return supplies.treasureHash[id];
        } else {
            return undefined;
        }
    };

    var saveSupply = function (category) {
        Storage.Set('supply' + category, {'supplies': supplies[category]});
    };

    var savePlanner = function () {
        Storage.Set('planners', {'planners': planners});
    };

    var updateSupply = function (id, category, number) {
        var ret = false;
        var supply = supplies[category][id];
        var intNum = parseInt(number);
        if (intNum < 0) {
            intNum = 0;
        }

        if (supply !== undefined && supply.count !== intNum) {
            supply.count = intNum;
            if (intNum > 9999) {
                intNum = 9999;
            }
            Message.PostAll({
                'setText': {
                    'id': '#supply-' + supply.sequence + '-' + id + '-count',
                    'value': intNum
                }
            });
            Message.PostAll({
                'setPlannerItemAmount': {
                    'id': id,
                    'sequence': supply.sequence,
                    'current': number
                }
            });
            if (responseList[category] !== undefined && responseList[category][id] !== undefined) {
                for (var i = 0; i < responseList[category][id].length; i++) {
                    responseList[category][id][i](id, intNum);
                }
            }
            ret = true;
        }
        return ret;
    };

    var incrementSupply = function (id, category, number) {
        if (supplies[category][id] !== undefined) {
            return updateSupply(id, category, supplies[category][id].count + parseInt(number));
        }
    };

    var newSupply = function (id, category, number, name, sequence) {
        supplies[category][id] = {
            name: name,
            count: parseInt(number),
            sequence: sequence,
        };
        if (category !== 'recovery' && category !== 'powerUp' && category !== 'draw') {
            supplies.treasureHash[id] = category;
        }
        var intNum = number;
        if (number > 9999) {
            intNum = 9999;
        }

        Message.PostAll({
            addItem: {
                'id': id,
                'category': category,
                'number': intNum,
                'name': name,
                'sequence': sequence,
                'tooltip': createTooltip(name)
            }
        });
        Message.PostAll({
            'setPlannerItemAmount': {
                'id': id,
                'sequence': sequence,
                'current': number
            }
        });
        if (responseList[category] !== undefined && responseList[category][id] !== undefined) {
            for (var i = 0; i < responseList[category][id].length; i++) {
                responseList[category][id][i](id, intNum);
            }
        }
        return true;
    };

    var buildWeapon = function (type, build) {
        var response = [];
        if (build.start <= build.end) {
            var itemHash = {};
            for (var i = build.start; i <= build.end; i++) {
                var items = plannersData[type][i].items;
                for (var j = 0; j < items.length; j++) {
                    var item = items[j];
                    var category = item.type;
                    var id;
                    if (category === 'currency') {
                        id = item.category;
                        category = 'currency';
                    }
                    else if (category === 'element') {
                        id = elements[item.materialType][item.materialTier][build.element].id;
                        category = elements[item.materialType][item.materialTier][build.element].category;
                    } else if (category === 'class') {
                        id = classes[item.materialType][build.type].id;
                        if (id === null) {
                            continue;
                        }
                        category = classes[item.materialType][build.type].category;
                    } else if (category === 'seraph') {

                    } else if (category === 'bahamut') {
                        id = bahamuts[build.type].id;
                        category = bahamuts[build.type].category;
                    } else if (category === 'revenantFiveStar') {
                        id = revenantFiveStars[item.materialType][build.type].id;
                        category = revenantFiveStars[item.materialType][build.type].category;
                    } else {
                        id = item.id;
                        category = item.category;
                    }
                    var hash = category + '-' + id;
                    if (itemHash[hash] !== undefined) {
                        response[itemHash[hash]].total += item.count;
                    } else {
                        itemHash[hash] = response.length;
                        var current = 0;
                        var tooltip = '';
                        var sequence = 0;
                        if (category === 'currency') {
                            current = Profile.Get(id);
                            if (id === 'crystal') {
                                tooltip = 'Crystals';
                                sequence = 0;
                            }
                        } else {
                            current = Supplies.Get(id, category);
                            var itemDatum = weaponSupplyInfo[category][id];
                            if (!itemDatum) {
                                debugger;
                            }
                            tooltip = createTooltip(itemDatum.name);
                            sequence = itemDatum.sequence;
                        }
                        response.push({
                            'id': id,
                            'category': category,
                            'current': current,
                            'total': item.count,
                            'tooltip': tooltip,
                            'sequence': sequence
                        });
                    }
                }
            }
            response.sort(function (a, b) {
                if (a.category === b.category) {
                    return a.sequence - b.sequence;
                } else {
                    var categoryHash = {
                        treasure: 0,
                        raid: 1,
                        material: 2,
                        event: 3,
                        coop: 4,
                        misc: 5,
                        recovery: 6,
                        powerUp: 7,
                        draw: 8,
                        other: 9,
                        currency: 10
                    };
                    return categoryHash[a.category] - categoryHash[b.category];
                }
            });
        }
        return response;
    };

    var createTooltip = function (name) {
        var tooltip = name;
        if (tooltips[name]) {
            for (var i = 0; i < tooltips[name].length; i++) {
                tooltip += '\n' + tooltips[name][i];
            }
        }
        return tooltip;
    };
})();