class Settings {
	constructor() {
		this.ignored = {}; // hostname:unixTimeStamp pairs
		this.defaults = {
			'ignorePeriod': 7, //-1 = permanent, 0 = session-only, 1+ = X days
			'incognitoWhitelist': {},
			'knownSecure': {},
			'autoDowngrade': true,
			'rememberSecureSites': true,
			'whitelist': {}
		};
		this.loading = (async () => {
			const data = browser.storage.local;
			let saved = await data.get(this.defaults);
			this.all = saved;
			await data.set(saved);
			if (this.ignorePeriod) await data.get().then(r => {
				if (r.ignored) this.ignored = r.ignored;
			});
			browser.storage.onChanged.addListener((changes, area) => {
				console.debug(`HTTPZ: ${area} storage changed`);
				for (const i in changes) {
					if (changes[i].hasOwnProperty('newValue')) this[i] = changes[i].newValue;
					else if (changes[i].hasOwnProperty('oldValue')) delete this[i];
				}
				if (changes.ignorePeriod) data.set({ignored: this.ignored});
			});
			console.log('HTTPZ: settings loaded');
			delete this.loading;
		})();
	}
	get all() {
		return (async () => {
			if (this.loading) await this.loading;
			const val = {};
			for (const i in this.defaults) val[i] = this[i];
			return val;
		})();
	}
	set all(obj) {
		for (const i in obj) this[i] = obj[i];
	}
}

class DelayableAction {
	constructor(step, timeout, callback) {
		this.callback = callback;
		this.step = step;
		this.timeout = timeout;
	}
	run() {
		this.count = 0;
		if (!this.timerID) {
			this.countdown = this.timeout;
			this.timerID = setInterval(t => {
				if (++t.count >= t.step || !--t.countdown) t.stop();
			}, 1000, this);
		}
	}
	stop() {
		if (this.timerID) {
			clearInterval(this.timerID);
			this.timerID = null;
			this.callback();
		}
	}
}
