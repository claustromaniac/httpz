'use strict';

const processed = new Set();
const stackCleaner = new DelayableAction(60, 120, () => {
	processed.clear();
});
const ignoredSaver = new DelayableAction(10, 60, () => {
	if (settings.ignorePeriod) browser.storage.local.set({ignored: settings.ignored});
});
const secureSaver = new DelayableAction(10, 60, () => {
	browser.storage.local.set({knownSecure: settings.knownSecure});
});
const filter = {urls: ["http://*/*"], types: ['main_frame']};
const sfilter = {urls: ["https://*/*"], types: ['main_frame']};

/** ---------- Functions ---------- **/

function IPinRange(ip, min, max) {
	for (const i in ip) {
		if (ip[i] < min[i] || ip[i] > max[i]) return;
	}
	return true;
}

function isReservedAddress(str) {
	const addr = str.split('.');
	if (addr.length !== 4) return addr.length == 1; // no dots = loopback or the like
	for (const part of addr) {
		if (Number.isNaN(+part) || part < 0 || part > 255) return;
	}
	return (
		IPinRange(addr, [10,0,0,0], [10,255,255,255]) ||
		IPinRange(addr, [100,64,0,0], [100,127,255,255]) ||
		IPinRange(addr, [127,0,0,0], [127,255,255,255]) ||
		IPinRange(addr, [169,254,0,0], [169,254,255,255]) ||
		IPinRange(addr, [172,16,0,0], [172,31,255,255]) ||
		IPinRange(addr, [192,0,0,0], [192,0,0,255]) ||
		IPinRange(addr, [192,168,0,0], [192,168,255,255]) ||
		IPinRange(addr, [198,18,0,0], [198,19,255,255])
	);
}

function isWhitelisted(host) {
	return settings.whitelist.hasOwnProperty(host) || settings.incognitoWhitelist.hasOwnProperty(host);
}

function ignore(host) {
	if (!settings.ignored[host]) {
		settings.ignored[host] = Date.now();
		if (settings.ignorePeriod) ignoredSaver.run();
	}
}

function downgrade(url, d) {
	ignore(url.hostname);
	url.protocol = 'http:';
	browser.tabs.update(
		d.tabId,
		{ loadReplace: true, url: url.toString() }
	);
}

function daysSince(unixTimeStamp) {
	return (Date.now() - unixTimeStamp) / 86400000;
}

/** ------------------------------ **/

browser.webRequest.onBeforeRequest.addListener(d => {
	const url = new URL(d.url);
	if (settings.ignorePeriod > 0) {
		const ignoredTime = settings.ignored[url.hostname];
		if (ignoredTime && daysSince(ignoredTime) > settings.ignorePeriod) {
			delete settings.ignored[url.hostname];
		}
	}
	if (
		!settings.ignored[url.hostname] &&
		!isWhitelisted(url.hostname) &&
		!isReservedAddress(url.hostname)
	) {
		processed.add(url.hostname);
		stackCleaner.run();
		url.protocol = 'https:';
		return {redirectUrl: url.toString()}
	}
}, filter, ['blocking']);

browser.webRequest.onBeforeRedirect.addListener(d => {
	const url = new URL(d.url);
	const newTarget = new URL(d.redirectUrl);
	if (url.hostname === newTarget.hostname) {
		if (newTarget.protocol === 'http:') ignore(url.hostname);
	} else if (processed.has(url.hostname)) {
		processed.add(newTarget.hostname);
		stackCleaner.run();
	}
}, sfilter);

browser.webRequest.onBeforeRedirect.addListener(d => {
	const newTarget = new URL(d.redirectUrl);
	if (newTarget.protocol === 'https:') {
		const url = new URL(d.url);
		if (isWhitelisted(url.hostname)) processed.delete(url.hostname);
		if (isWhitelisted(newTarget.hostname)) processed.delete(newTarget.hostname);
	}
}, filter);

browser.webRequest.onCompleted.addListener(d => {
	const url = new URL(d.url);
	if (processed.has(url.hostname)) browser.pageAction.show(d.tabId);
	if (settings.rememberSecureSites && !settings.knownSecure.hasOwnProperty(url.hostname)) {
		settings.knownSecure[url.hostname] = null;
		secureSaver.run();
	}
}, sfilter);

browser.webRequest.onCompleted.addListener(d => {
	const url = new URL(d.url);
	if (isWhitelisted(url.hostname)) browser.pageAction.show(d.tabId);
}, filter);

browser.webRequest.onErrorOccurred.addListener(d => {
	const url = new URL(d.url);
	if (processed.has(url.hostname)) {
		if (!settings.autoDowngrade) {
			browser.tabs.update(d.tabId, {
				loadReplace: true,
				url: `${warningPage}?target=${d.url}`
			});
		} else if (
			!settings.rememberSecureSites ||
			!settings.knownSecure.hasOwnProperty(url.hostname)
		) downgrade(url, d);
	}
}, sfilter);

browser.webRequest.onErrorOccurred.addListener(d => {
	const url = new URL(d.url);
	if (settings.ignored[url.hostname] && processed.has(url.hostname)) {
		delete settings.ignored[url.hostname];
	}
}, filter);
