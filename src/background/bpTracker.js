class BpTracker {
    constructor() {
        this.currentBp = 0;
        this.maxBp = 0;

        this.bpTime = {
            hour: 0,
            minute: 0,
            second: 0
        };
    }

    updateFromJson(status) {
        this.setBp(status.bp, status.max_battle_point);
        if (status.battle_point_remain.indexOf('00:00') === -1) {
            const index = status.battle_point_remain.indexOf('h');
            const hour = this.bpTime.hour;
            const minute = this.bpTime.minute;
            if (index !== -1) {
                this.bpTime.hour = Number(status.battle_point_remain.substring(0, index));
            } else {
                this.bpTime.hour = 0;
            }
            if (status.battle_point_remain.indexOf('m') !== -1) {
                this.bpTime.minute = Number(status.battle_point_remain.substring(index + 1, status.battle_point_remain.length - 1));
            } else {
                this.bpTime.minute = 0;
            }
            if (hour !== this.bpTime.hour || minute !== this.bpTime.minute) {
                this.bpTime.second = 59;
                this.setBpTime();
                this.resetBpTimer();
            }
        } else {
            this.stopBpTimer();
        }
    }
    spendBpFromJson(payload) {
        if (payload.select_bp) {
            this.spendBp(parseInt(payload.select_bp));
        }
    }
    getMaxBp() {
        return this.maxBp;
    }
    spendBp(amount) {
        let full = false;
        if (this.currentBp >= this.maxBp) {
            full = true;
            this.setBp(this.currentBp - amount, this.maxBp);
            if (this.currentBp < this.maxBp) {
                amount = this.maxBp - this.currentBp;
            } else {
                return;
            }
        } else {
            this.setBp(this.currentBp - amount, this.maxBp);
        }
        if (this.currentBp < this.maxBp) {
            this.bpTime.minute += amount * 10 % 60;
            if (this.bpTime.minute >= 60) {
                this.bpTime.minute -= 60;
                this.bpTime.hour++;
            }
            if (full) {
                this.bpTime.minute--;
                if (this.bpTime.minute < 0) {
                    this.bpTime.minute += 60;
                    this.bpTime.hour--;
                }
                this.bpTime.second = 59;
            }
            this.bpTime.hour += Math.floor(amount * 10 / 60);
            this.setBpTime();
            if (!this.bpTimer) {
                this.resetBpTimer();
            }
        }
    }
    setBp(current, max) {
        this.currentBp = parseInt(current);
        this.maxBp = parseInt(max);
        Message.PostAll({
            setText: {
                'id': '#bp-number',
                'value': 'EP: ' + this.currentBp + '/' + this.maxBp
            }
        });
        Message.PostAll({
            setBar: {
                'id': '#bp-bar',
                'value': ((this.currentBp / this.maxBp) * 100) + '%'
            }
        });
    }
    addBp(amount) {
        this.setBp(this.currentBp + amount, this.maxBp);
        if (this.currentBp >= this.maxBp) {
            this.stopBpTimer();
        } else {
            this.bpTime.minute -= amount * 10 % 60;
            if (this.bpTime.minute < 0) {
                this.bpTime.minute += 60;
                this.bpTime.hour--;
            }
            this.bpTime.hour -= Math.floor(amount * 10 / 60);
            this.setBpTime();
        }
    }
    setBpTime() {
        let output = "";
        if (this.bpTime.hour > 0) {
            output += this.bpTime.hour + ':';
            if (this.bpTime.minute < 10) {
                output += '0'
            }
        }
        if (this.bpTime.minute > 0 || (this.bpTime.minute === 0 && this.bpTime.hour > 0)) {
            output += this.bpTime.minute + ':';
            if (this.bpTime.second < 10) {
                output += '0';
            }
        }
        output += this.bpTime.second;
        if (parseInt(output) <= 0) {
            output = "";
        }
        Message.PostAll({
            setText: {
                'id': '#bp-time',
                'value': output
            }
        });
    }

    resetBpTimer() {
        clearInterval(this.bpTimer);

        this.bpTimer = setInterval(() => {
            this.bpTime.second--;
            if (this.bpTime.second < 0) {
                this.bpTime.minute--;
                if (this.bpTime.minute < 0) {
                    this.bpTime.hour--;
                    if (this.bpTime.hour < 0) {
                        this.setBp(this.currentBp + 1, this.maxBp);
                        this.stopBpTimer();
                        this.setBpTime();
                        Message.Notify('Your EP is full!', this.currentBp + '/' + this.maxBp + ' EP', 'epNotifications');
                        return;
                    }
                    this.bpTime.minute = 59;
                }
                if ((this.bpTime.minute === 19 || this.bpTime.minute === 39 || this.bpTime.minute === 59) &&
                    !(this.bpTime.hour === Math.floor((this.maxBp * 10 - 1) / 60) && this.bpTime.minute === (this.maxBp * 10 - 1) % 60)) {
                    this.setBp(this.currentBp + 1, this.maxBp);
                }
                this.bpTime.second = 59;
            }
            this.setBpTime();
        }, 1000);
    }
    stopBpTimer() {
        this.bpTime.second = 0;
        this.bpTime.minute = 0;
        this.bpTime.hour = 0;
        clearInterval(this.bpTimer);
        this.bpTimer = false;
        this.setBpTime();
    }
}