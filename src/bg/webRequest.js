'use strict';

const exceptions = new Set([
	'NS_ERROR_ABORT',
	'NS_BINDING_ABORTED',
	'NS_ERROR_UNKNOWN_HOST'
]);
const filter = {urls: ["http://*/*"], types: ['main_frame']};
const sfilter = {urls: ["https://*/*"], types: ['main_frame']};
const warningPage = runtime.getURL('pages/error.htm');
const redirectPage = runtime.getURL('pages/redirect.htm');
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
	if (!sAPI.autoDowngrade) {
		tabsData[d.tabId].url = d.url;
		tabs.update(d.tabId, {
			loadReplace: true,
			url: warningPage
		});
	} else if (!sAPI.rememberSecureSites || !isKnown(url.hostname)) {
		ignore(url.hostname, d.tabId);
		url.protocol = 'http:';
		tabs.update(
			d.tabId,
			{ loadReplace: true, url: url.toString() }
		);
	}
}

async function promisify(rv) {return rv};

const preventCaching = d => {
	if (!d.responseHeaders) return;
	const url = new URL(d.url);
	if (!processed.has(url.hostname)) return;
	const newHeaders = d.responseHeaders.filter(h => {
		return h.name.toLowerCase() !== 'cache-control';
	});
	newHeaders.push({
		name: 'Cache-Control',
		value: 'no-cache, no store, must-revalidate'
	});
	return promisify({responseHeaders: newHeaders});
};

/** ------------------------------ **/

webReq.onBeforeRequest.addListener(d => {
	const url = new URL(d.url);
	if (tabsData[d.tabId].intercepting) {
		const intercepting = tabsData[d.tabId].intercepting;
		delete tabsData[d.tabId].intercepting;
		if (intercepting === url.hostname) return promisify({cancel: true});
	}
	if (
		!isIgnored(url.hostname) &&
		!isWhitelisted(url.hostname) &&
		!url.hostname.endsWith('.onion') &&
		!isReservedAddress(url.hostname)
	) {
		if (sAPI.NSRedirectionsFix && tabsData[d.tabId].loading) {
			ignore(tabsData[d.tabId].loading, d.tabId);
			delete tabsData[d.tabId].loading;
		}
		url.protocol = 'https:';
		processed.add(url.hostname);
		setCleaner.run();
		if (sAPI.maxWait) tabsData[d.tabId].timerID = setTimeout(() => {
			downgrade(url, d);
		}, sAPI.maxWait*1000);
		return promisify({
			redirectUrl: url.toString()
		});
	}
}, filter, ['blocking']);

webReq.onHeadersReceived.addListener(
	preventCaching,
	sfilter,
	['blocking', 'responseHeaders']
);

webReq.onBeforeRedirect.addListener(d => {
	const url = new URL(d.url);
	const newTarget = new URL(d.redirectUrl);
	let downgrading;
	if (newTarget.protocol === 'http:') {
		downgrading = true;
		newTarget.protocol = 'https:';
	}
	if (downgrading && d.url === newTarget.toString()) {
		if (sAPI.interceptRedirects) {
			if (
				!isIgnored(url.hostname) &&
				!isWhitelisted(url.hostname)
			) {
				tabsData[d.tabId].intercepting = url.hostname;
				tabsData[d.tabId].url = d.url;
				tabs.update(d.tabId, {
					loadReplace: true,
					url: redirectPage
				});
			}
		} else ignore(url.hostname, d.tabId);
	} else if (processed.has(url.hostname)) {
		processed.add(newTarget.hostname);
		setCleaner.run();
	}
}, sfilter);

webReq.onBeforeRedirect.addListener(d => {
/*	prevent showing the page action when something (anything) redirects a whitelisted or
	ignored request from http to https
	IMPORTANT: the documentation for this event says it is fired only on server-initiated
	redirections, but it is wrong. Even this very extension fires this when upgrading */
	const target = new URL(d.redirectUrl);
	if (
		target.protocol === 'https:' &&
		( isWhitelisted(target.hostname) || isIgnored(target.hostname) )
	) processed.delete(target.hostname);
}, filter);

webReq.onResponseStarted.addListener(d => {
	// required only as part of the mechanism that detects non-standard redirections to http
	const url = new URL(d.url);
	if (processed.has(url.hostname)) tabsData[d.tabId].loading = url.hostname;
}, sfilter);

webReq.onCompleted.addListener(d => {
	const url = new URL(d.url);
	if (processed.has(url.hostname)) {
		if (tabsData[d.tabId].timerID) clearTimeout(tabsData[d.tabId].timerID);
		if (
			sAPI.proxyCompat &&
			(d.statusCode === 502 || d.statusCode === 504)
		) {
			console.info(`HTTPZ: status code ${d.statusCode} (Proxy-Compatible Mode)`);
			return downgrade(url, d);
		}
	}
	if (sAPI.rememberSecureSites) remember(url.hostname, d.tabId);
}, sfilter);

webReq.onErrorOccurred.addListener(d => {
	console.info(`HTTPZ: ${d.error}`, d);
	const url = new URL(d.url);
	if (processed.has(url.hostname)) {
		if (tabsData[d.tabId]) {
			tabsData[d.tabId].error = d.error;
			delete tabsData[d.tabId].loading;
			if (tabsData[d.tabId].timerID) clearTimeout(tabsData[d.tabId].timerID);
		}
		if (!exceptions.has(d.error)) downgrade(url, d);
	}
}, sfilter);

webReq.onErrorOccurred.addListener(d => {
	const url = new URL(d.url);
	if (processed.has(url.hostname) && isIgnored(url.hostname)) {
		delete sAPI.ignored[url.hostname];
		delete sAPI.ignored_pb[url.hostname];
	}
}, filter);
