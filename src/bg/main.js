'use strict';

class DelayableAction {
	constructor(step, timeout, callback, interval = 1) {
		this.callback = callback;
		this.step = step;
		this.timeout = timeout;
		this.interval = interval;
	}
	run() {
		this.count = 0;
		if (!this.timerID) {
			this.countdown = this.timeout;
			this.timerID = setInterval(t => {
				const i = this.interval;
				if (
					(t.count += i) >= t.step ||
					(t.countdown -= i) <= 0
				) t.stop();
			}, this.interval*1000, this);
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

const local = browser.storage.local;
const pageAction = browser.pageAction;
const runtime = browser.runtime;
const tabs = browser.tabs;
const processed = new Set();
//FF56 compatibility
tabs._update = tabs.update;	
tabs.update = async function (id, p) { 
	try {
		await tabs._update(id, p);
		tabs.update = tabs._update;
		delete tabs._update;
	} catch (ex) {
		if (
			typeof ex === 'object' &&
			ex.message &&
			ex.message.includes('loadReplace')
		) {
			tabs.update = async function (_id, _p) {
				delete _p.loadReplace;
				tabs._update(_id, _p);
			};
			tabs.update(id, p);
		}
	}
};

const ignoredSaver = new DelayableAction(10, 60, () => {
	if (sAPI.ignorePeriod) local.set({ignored: sAPI.ignored});
});
const secureSaver = new DelayableAction(10, 120, () => {
	local.set({knownSecure: sAPI.knownSecure});
});
const setCleaner = new DelayableAction(100, 300, () => {
	processed.clear();
}, 10);
const tabsData = {};

const sAPI = {
	ignored: {}, // hostname:unixTimeStamp pairs
	ignored_pb: {},
	knownSecure_pb: {},
	defaults: {
		'autoDowngrade': true,
		'ignorePeriod': 7, //-1 = permanent, 0 = session-only, 1+ = X days
		'incognitoWhitelist': {},
		'NSRedirectionsFix': true,
		'honorPB': true,
		'interceptRedirects': false,
		'knownSecure': {},
		'maxWait': 0,
		'proxyCompat': false,
		'rememberSecureSites': true,
		'whitelist': {}
	},
	async getAll() {
		if (this.loading) await this.loading;
		const res = {};
		for (const i in this.defaults) res[i] = this[i];
		return res;
	},
	init() {
		if (this.ignorePeriod < 1 && this.idleListener) {
			browser.idle.onStateChanged.removeListener(this.idleListener);
			delete this.idleListener;
		} else if (this.ignorePeriod > 0 && !this.idleListener) {
			this.idleListener = browser.idle.onStateChanged.addListener(state => {
				if (state === 'active') return;
				let count = 0;
				for (const i in this.ignored) {
					if (!isIgnored(i)) count++;
				}
				if (count) {
					console.log(`HTTPZ: removed ${count} expired item(s) from the ignore list`);
					ignoredSaver.run();
				}
			});
		}
	}
};

sAPI.loading = (async () => {
	let saved = await local.get(sAPI.defaults);
	for (const i in saved) sAPI[i] = saved[i];
	await local.set(saved);
	if (sAPI.ignorePeriod) await local.get().then(r => {
		if (r.ignored) sAPI.ignored = r.ignored;
	});
	sAPI.init();
	console.log('HTTPZ: settings loaded');
	delete sAPI.loading;
})();

sAPI.loading.then(() => {
	browser.storage.onChanged.addListener((changes, area) => {
		console.debug(`HTTPZ: ${area} storage changed`, changes);
		for (const i in changes) sAPI[i] = changes[i].newValue;
		if (changes.ignorePeriod) {
			local.set({
				ignored: changes.ignorePeriod.newValue ? sAPI.ignored : {}
			});
			sAPI.init();
		}
		if (changes.honorPB && !changes.honorPB.newValue) {
			sAPI.ignored_pb = {};
			sAPI.knownSecure_pb = {};
		}
	});
});

function daysSince(unixTimeStamp) {
	return (Date.now() - unixTimeStamp) / 86400000;
}

function ignore(host, tabId) {
	if (sAPI.honorPB && tabsData[tabId].incognito) {
		if (!sAPI.ignored_pb[host]) sAPI.ignored_pb[host] = Date.now();
	} else if (!sAPI.ignored[host]) {
		sAPI.ignored[host] = Date.now();
		if (sAPI.ignorePeriod) ignoredSaver.run();
	}
	if (isKnown(host)) {
		delete sAPI.knownSecure[host];
		delete sAPI.knownSecure_pb[host];
		secureSaver.run();
	}
}

function remember(host, tabId) {
	if (sAPI.honorPB && tabsData[tabId].incognito) sAPI.knownSecure_pb[host] = null;
	else {
		sAPI.knownSecure[host] = null;
		secureSaver.run();
	}
}

function isIgnored(host) {
	if (sAPI.ignorePeriod > 0) {
		const time = sAPI.ignored[host];
		if (time && daysSince(time) > sAPI.ignorePeriod) {
			delete sAPI.ignored[host];
		}
	}
	return sAPI.ignored[host] || sAPI.ignored_pb[host];
}

function isKnown(host) {
	return sAPI.knownSecure.hasOwnProperty(host) || sAPI.knownSecure_pb.hasOwnProperty(host);
}

function isWhitelisted(host) {
	return sAPI.whitelist.hasOwnProperty(host) || sAPI.incognitoWhitelist.hasOwnProperty(host);
}
