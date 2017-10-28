class ApTracker {
    constructor() {
        this.currentAp = 0;
        this.maxAp = 0;
        this.apTime = {
            hour: 0,
            minute: 0,
            second: 0
        };

        this.questApCost = 0;
    }

    updateFromJson(status) {
        this.setAp(status.ap, status.max_action_point);
        if (status.action_point_remain.indexOf('00:00') === -1) {
            let index = status.action_point_remain.indexOf('h');
            let hour = this.apTime.hour;
            let minute = this.apTime.minute;
            if (index !== -1) {
                this.apTime.hour = Number(status.action_point_remain.substring(0, index));
            }

            if (status.action_point_remain.indexOf('m') !== -1) {
                this.apTime.minute = Number(status.action_point_remain.substring(index + 1, status.action_point_remain.length - 1));
            } else {
                this.apTime.minute = 0;
            }
            if (hour !== this.apTime.hour || minute !== this.apTime.minute) {
                this.apTime.second = 59;
                this.setApTime();
                this.resetApTimer();
            }
        } else {
            this.stopApTimer();
        }
    }

    stageQuest(apCost) {
        this.questApCost = apCost;
    }
    
    getMaxAp() {
        return this.maxAp;
    }

    spendApOnStagedQuest() {
        let full;

        if (this.currentAp >= this.maxAp) {
            full = true;
            this.setAp(this.currentAp - this.questApCost, this.maxAp);
            if (this.currentAp < this.maxAp) {
                this.questApCost = this.maxAp - this.currentAp;
            } else {
                return;
            }
        } else {
            this.setAp(this.currentAp - this.questApCost, this.maxAp);
        }

        if (this.currentAp < this.maxAp) {
            this.apTime.minute += this.questApCost * 5 % 60;
            if (this.apTime.minute >= 60) {
                this.apTime.minute -= 60;
                this.apTime.hour++;
            }

            if (full) {
                this.apTime.minute--;
                if (this.apTime.minute < 0) {
                    this.apTime.minute += 60;
                    this.apTime.hour--;
                }
                this.apTime.second = 59;
            }

            // todo: where does amt come from?
            // this.apTime.hour += Math.floor(amt * 5 / 60);

            this.setApTime();
            if (!this.apTimer) {
                this.resetApTimer();
            }
        }
    }

    addAp(amount) {
        this.setAp(this.currentAp + amount, this.maxAp);
        if (this.currentAp >= this.maxAp) {
            this.stopApTimer();
        } else {
            this.apTime.minute -= amount * 5 % 60;
            if (this.apTime.minute < 0) {
                this.apTime.minute += 60;
                this.apTime.hour--;
            }
            this.apTime.hour -= Math.floor(amount * 5 / 60);
            this.setApTime();
        }
    }

    setAp(current, max) {
        this.currentAp = parseInt(current);
        this.maxAp = parseInt(max);
        Message.PostAll({
            setText: {
                'id': '#ap-number',
                'value': 'AP: ' + this.currentAp + '/' + this.maxAp
            }
        });
        Message.PostAll({
            setBar: {
                'id': '#ap-bar',
                'value': ((this.currentAp / this.maxAp) * 100) + '%'
            }
        });
    }

    setApTime() {
        let output = "";
        if (this.apTime.hour > 0) {
            output += this.apTime.hour + ':';
            if (this.apTime.minute < 10) {
                output += '0'
            }
        }
        if (this.apTime.minute > 0 || (this.apTime.minute === 0 && this.apTime.hour > 0)) {
            output += this.apTime.minute + ':';
            if (this.apTime.second < 10) {
                output += '0';
            }
        }
        output += this.apTime.second;
        if (parseInt(output) <= 0) {
            output = "";
        }
        Message.PostAll({
            setText: {
                'id': '#ap-time',
                'value': output
            }
        });
    }

    resetApTimer() {
        clearInterval(this.apTimer);
        this.apTimer = setInterval(() => {
            this.apTime.second--;
            if (this.apTime.second < 0) {
                this.apTime.minute--;
                if (this.apTime.minute < 0) {
                    this.apTime.hour--;
                    if (this.apTime.hour < 0) {
                        this.stopApTimer();
                        this.setAp(this.currentAp + 1, this.maxAp);
                        this.setApTime();
                        Message.Notify('Your AP is full!', this.currentAp + '/' + this.maxAp + ' AP', 'apNotifications');
                        return;
                    }
                    this.apTime.minute = 59;
                }

                if ((this.apTime.minute % 10 === 4 || this.apTime.minute % 10 === 9) && !(this.apTime.hour === Math.floor((this.maxAp * 5 - 1) / 60) && this.apTime.minute === (this.maxAp * 5 - 1) % 60)) {
                    this.setAp(this.currentAp + 1, this.maxAp);
                }
                this.apTime.second = 59;
            }
            this.setApTime();
        }, 1000);
    }

    stopApTimer() {
        this.apTime.second = 0;
        this.apTime.minute = 0;
        this.apTime.hour = 0;
        clearInterval(this.apTimer);
        this.apTimer = false;
        this.setApTime();
    }
}