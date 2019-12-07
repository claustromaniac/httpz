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

async function downgrade(url, d) {
	if (!sAPI.autoDowngrade) {
		(await tabsData.get(d.tabId)).url = d.url;
		tabs.update(d.tabId, {
			loadReplace: true,
			url: warningPage
		});
	} else if (!sAPI.rememberSecureSites || !isKnown(url.hostname)) {
		await ignore(url.hostname, d.tabId);
		url.protocol = 'http:';
		tabs.update(
			d.tabId,
			{ loadReplace: true, url: url.toString() }
		);
	}
}

/** ------------------------------ **/

webReq.onBeforeRequest.addListener(async d => {
	if (d.tabId === -1) return;
	const url = new URL(d.url);
	const tabData = await tabsData.get(d.tabId);
	if (tabData.intercepting) {
		const intercepting = tabData.intercepting;
		delete tabData.intercepting;
		if (intercepting === url.hostname) return {cancel: true};
	}
	if (
		!isIgnored(url.hostname) &&
		!isWhitelisted(url.hostname) &&
		!url.hostname.endsWith('.onion') &&
		!isReservedAddress(url.hostname)
	) {
		if (sAPI.NSRedirectionsFix && tabData.loading) {
			await ignore(tabData.loading, d.tabId);
			delete tabData.loading;
		}
		url.protocol = 'https:';
		processed.add(url.hostname);
		setCleaner.run();
		if (sAPI.maxWait) tabData.timerID = setTimeout(() => {
			downgrade(url, d);
		}, sAPI.maxWait*1000);
		return {redirectUrl: url.toString()};
	}
}, filter, ['blocking']);

webReq.onHeadersReceived.addListener(async d => {
	//prevent caching processed requests to avoid potential issues
	if (d.tabId === -1) return;
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
	return {responseHeaders: newHeaders};
}, sfilter, ['blocking', 'responseHeaders']);

webReq.onBeforeRedirect.addListener(async d => {
	if (d.tabId === -1) return;
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
				const tabData = await tabsData.get(d.tabId);
				tabData.intercepting = url.hostname;
				tabData.url = d.url;
				tabs.update(d.tabId, {
					loadReplace: true,
					url: redirectPage
				});
			}
		} else await ignore(url.hostname, d.tabId);
	} else if (processed.has(url.hostname)) {
		processed.add(newTarget.hostname);
		setCleaner.run();
	}
}, sfilter);

webReq.onResponseStarted.addListener(async d => {
	if (d.tabId === -1) return;
	// required only as part of the mechanism that detects non-standard redirections to http
	const url = new URL(d.url);
	if (processed.has(url.hostname)) (await tabsData.get(d.tabId)).loading = url.hostname;
}, sfilter);

webReq.onCompleted.addListener(async d => {
	if (d.tabId === -1) return;
	const url = new URL(d.url);
	if (processed.has(url.hostname)) {
		const tabData = await tabsData.get(d.tabId);
		if (tabData.timerID) clearTimeout(tabData.timerID);
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

webReq.onErrorOccurred.addListener(async d => {
	if (d.tabId === -1) return;
	console.info(`HTTPZ: ${d.error}`, d);
	const url = new URL(d.url);
	if (processed.has(url.hostname)) {
		const tabData = await tabsData.get(d.tabId);
		tabData.error = d.error;
		delete tabData.loading;
		if (tabData.timerID) clearTimeout(tabData.timerID);
		if (!exceptions.has(d.error)) downgrade(url, d);
	}
}, sfilter);

webReq.onErrorOccurred.addListener(d => {
	if (d.tabId === -1) return;
	const url = new URL(d.url);
	if (processed.has(url.hostname) && isIgnored(url.hostname)) {
		delete sAPI.ignored[url.hostname];
		delete sAPI.ignored_pb[url.hostname];
	}
}, filter);
