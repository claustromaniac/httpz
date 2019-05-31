'use strict';

const exceptions = new Set([
	'NS_ERROR_ABORT',
	'NS_BINDING_ABORTED',
	'NS_ERROR_UNKNOWN_HOST'
]);
const filter = {urls: ["http://*/*"], types: ['main_frame']};
const processed = new Set();
const sfilter = {urls: ["https://*/*"], types: ['main_frame']};
const warningPage = browser.runtime.getURL('pages/error.htm');
const webReq = browser.webRequest;

/** ---------- Functions ---------- **/

function IPinRange(ip, min, max) {
	for (const i in ip) {
		if (ip[i] > max[i] || ip[i] < min[i]) return;
	}
	return true;
}

function isReservedAddress(str) {
	const addr = str.split('.');
	if (addr.length !== 4) return addr.length == 1; // no dots = loopback or the like
	for (const part of addr) {
		if (Number.isNaN(+part) || part > 255 || part < 0) return;
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

function downgrade(url, d) {
	ignore(url.hostname);
	url.protocol = 'http:';
	browser.tabs.update(
		d.tabId,
		{ loadReplace: true, url: url.toString() }
	);
}

/** ------------------------------ **/

webReq.onBeforeRequest.addListener(d => {
	const url = new URL(d.url);
	if (
		!isIgnored(url.hostname) &&
		!isWhitelisted(url.hostname) &&
		!isReservedAddress(url.hostname)
	) {
		processed.add(url.hostname);
		stackCleaner.run();
		url.protocol = 'https:';
		return {redirectUrl: url.toString()}
	}
}, filter, ['blocking']);

webReq.onBeforeRedirect.addListener(d => {
	const url = new URL(d.url);
	const newTarget = new URL(d.redirectUrl);
	if (newTarget.protocol === 'http:') ignore(url.hostname);
	else if (processed.has(url.hostname)) {
		processed.add(newTarget.hostname);
		stackCleaner.run();
	}
}, sfilter);

webReq.onBeforeRedirect.addListener(d => {
	const url = new URL(d.url);
	const newTarget = new URL(d.redirectUrl);
	if (newTarget.protocol === 'https:') {
		if (isWhitelisted(url.hostname)) processed.delete(url.hostname);
		if (isWhitelisted(newTarget.hostname)) processed.delete(newTarget.hostname);
	} else {
		processed.add(newTarget.hostname);
		stackCleaner.run();
	}
}, filter);

webReq.onCompleted.addListener(d => {
	const url = new URL(d.url);
	if (processed.has(url.hostname)) browser.pageAction.show(d.tabId);
	if (sAPI.rememberSecureSites && !sAPI.knownSecure.hasOwnProperty(url.hostname)) {
		sAPI.knownSecure[url.hostname] = null;
		secureSaver.run();
	}
}, sfilter);

webReq.onCompleted.addListener(d => {
	const url = new URL(d.url);
	if (isWhitelisted(url.hostname)) browser.pageAction.show(d.tabId);
}, filter);

webReq.onErrorOccurred.addListener(d => {
	console.info(`HTTPZ: ${d.error}`);
	const url = new URL(d.url);
	if (processed.has(url.hostname) && !exceptions.has(d.error)) {
		if (!sAPI.autoDowngrade) {
			browser.tabs.update(d.tabId, {
				loadReplace: true,
				url: `${warningPage}?target=${d.url}`
			});
		} else if (
			!sAPI.rememberSecureSites ||
			!sAPI.knownSecure.hasOwnProperty(url.hostname)
		) downgrade(url, d);
	}
}, sfilter);

webReq.onErrorOccurred.addListener(d => {
	const url = new URL(d.url);
	if (sAPI.ignored[url.hostname] && processed.has(url.hostname)) {
		delete sAPI.ignored[url.hostname];
	}
}, filter);
