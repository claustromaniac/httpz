'use strict';

const processed = new Set();
const stackCleaner = new DelayableAction(60, 120, () => {
	processed.clear();
});
const ignoredSaver = new DelayableAction(10, 60, () => {
	if (settings.ignorePeriod) browser.storage.local.set({ignored: settings.ignored});
});
const filter = {urls: ["http://*/*"], types: ['main_frame']};
const sfilter = {urls: ["https://*/*"], types: ['main_frame']};
const error_rx = /^SEC_ERROR|(?:_|\b)(?:SSL|TLS|CERT)(?:_|\b)|\b[Cc]ertificate/;
const other_errors = new Set([
	'MOZILLA_PKIX_ERROR_ADDITIONAL_POLICY_CONSTRAINT_FAILED',
	'NS_ERROR_CONNECTION_REFUSED',
	'NS_ERROR_NET_TIMEOUT',
	'Peer reports it experienced an internal error.',
	'Peer using unsupported version of security protocol.'
]);

/** ---------- Functions ---------- **/

function IPinRange(ip, min, max) {
	for (const i in ip) {
		if (ip[i] < min[i] || ip[i] > max[i]) return;
	}
	return true;
}

function isReservedAddress(str) {
	const addr = str.split('.');
	if (addr.length !== 4) return;
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
		!settings.whitelist[url.hostname] &&
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

browser.webRequest.onCompleted.addListener(d => {
	const url = new URL(d.url);
	if (!processed.has(url.hostname)) return;
	if ( d.statusCode >= 400 && !settings.ignored[url.hostname] ) downgrade(url, d);
	else browser.pageAction.show(d.tabId);
}, sfilter);

browser.webRequest.onCompleted.addListener(d => {
	const url = new URL(d.url);
	if (settings.whitelist[url.hostname]) browser.pageAction.show(d.tabId);
}, filter);

browser.webRequest.onErrorOccurred.addListener(d => {
	const url = new URL(d.url);
	if ( processed.has(url.hostname) && !settings.ignored[url.hostname] &&
		( error_rx.test(d.error) || other_errors.has(d.error) )
	) downgrade(url, d);
	else console.info(`Error info: ${d.error}`);
}, sfilter);

browser.webRequest.onErrorOccurred.addListener(d => {
	if (settings.ignored[url.hostname] && processed.has(url.hostname)) {
		delete settings.ignored[url.hostname];
	}
}, filter);
