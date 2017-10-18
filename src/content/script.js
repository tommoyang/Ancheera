(function () {
    $(window).on('beforeunload', function () {
        chrome.runtime.sendMessage({refresh: true});
    });
    var tempImageURLS = {};

    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        if (message.pageLoad) {
            pageLoad(message.pageLoad);
        }
        // if(message.pageUpdate) {
        //   pageUpdate(message.pageUpdate);
        // }
        if (message.selectQuest) {
            $('.prt-list-contents').each(function (index) {
                tempImageURLS[$(this).find('.txt-quest-title').first().text()] = $(this).find('.img-quest').first().attr('src');
            });
        }
        if (message.startQuest) {
            if (tempImageURLS[message.startQuest.name] !== undefined) {
                sendResponse(tempImageURLS[message.startQuest.name]);
            } else {
                sendResponse(null);
            }
        }
        if (message.checkRaids) {
            list = $('#prt-multi-list');
            raids = [];
            list.find('.btn-multi-raid').each(function (index) {
                if ($(this).find('.ico-enter').length > 0) {
                    raids.push({
                        id: "" + $(this).data('raid-id'),
                        name: $(this).data('chapter-name'),
                        imgURL: $(this).find('.img-raid-thumbnail').first().attr('src'),
                        host: ($(this).find('.txt-request-name').text() === "You started this raid battle.")
                    });
                    //$(this).find('txt-request-name').text() === "You started this raid battle."
                }
            });
            var unclaimed = false;
            if ($('.btn-unclaimed').length > 0) {
                unclaimed = true;
            }
            var type;
            if ($('#tab-multi').hasClass('active')) {
                type = 'normal';
            } else {
                type = 'event';
            }
            messageDevTools({
                checkRaids: {
                    'raids': raids,
                    'unclaimed': unclaimed,
                    'type': type
                }
            });
        }
    });

    function pageLoad(url) {
        var response;
        if (url.indexOf('#guild') !== -1) {
            response = findInfoGuild();
            messageDevTools(response, 'guild');
        } else if (url.indexOf('#mypage') !== -1) {
            response = findInfoMypage();
            messageDevTools(response, 'mypage');
        } else if (url.indexOf('#coopraid/room/') !== -1) {
            response = findInfoCoop();
            messageDevTools(response, 'coop');
        } else if (url.indexOf('#casino') !== -1) {
            response = findInfoCasino();
            messageDevTools(response, 'casino');
        }
    }

    function findInfoGuild() {
        var $guildInfo = $('.prt-assault-guildinfo');

        if ($guildInfo.length > 0) {
            var times = [];
            $guildInfo.find('.prt-item-status').each(function (index) {
                var text = $(this).text();
                var hour = parseInt(text.split(':')[0]);
                if (text.indexOf('p.m.') !== -1 && text.indexOf('p.m') < text.length - 5) {
                    if (hour !== 12) {
                        hour += 12;
                    }
                } else if (hour === 12) {
                    hour = 0;
                }
                times[index] = hour;
            });
            return ({assault: {'times': times}});
        }
    }

    function findInfoMypage() {
        var $prtUserInfo = $('.prt-user-info');
        var $prtInfoStatus = $prtUserInfo.children('.prt-info-status');
        var $prtInfoPossessed = $prtUserInfo.children('.prt-info-possessed');
        var $prtMbpPossessed = $prtUserInfo.children('#mbp-status');

        return ({
            profile: {
                'rank': $prtInfoStatus.find('.txt-rank-value').attr('title'),
                'rankPercent': $prtInfoStatus.find('.prt-rank-gauge-inner').attr('style'),
                'job': $prtInfoStatus.find('.txt-joblv-value').attr('title'),
                'jobPercent': $prtInfoStatus.find('.prt-job-gauge-inner').attr('style'),
                'jobPoints': $prtInfoPossessed.eq(1).find('.prt-jp').text(),
                'renown': $prtMbpPossessed.find('.txt-current-point').eq(0).text(),
                'prestige': $prtMbpPossessed.find('.txt-current-point').eq(1).text()//$(this).text()
            }
        });
    }

    function findInfoCoop() {
        return ({
            coopCode:
                $('.txt-room-id').eq(0).text()
        });
    }

    function findInfoCasino() {
        var amt = parseInt($('.prt-having-medal').children('.txt-value').first().attr('value'));
        if (!isNaN(amt)) {
            return ({
                chips: {
                    'amount': amt
                }
            });
        }
    }

    var tracked = {};

    function messageDevTools(message, id) {
        if (JSON.stringify(message) !== JSON.stringify(tracked[id])) {
            chrome.runtime.sendMessage({content: message});
            tracked[id] = message;
        }
    }
})();