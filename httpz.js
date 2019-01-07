'use strict';

const processed = new Set();
const ignored = new Set();
const filter = {urls: ["https://*/*"], types: ['main_frame']};
const error_rx = /^SEC_ERROR|\bSSL(?:_|\b)|(?:_|\b)CERT|\b[Cc]ertificate/;
const other_errors = new Set([
	'MOZILLA_PKIX_ERROR_ADDITIONAL_POLICY_CONSTRAINT_FAILED',
	'NS_ERROR_NET_ON_TLS_HANDSHAKE_ENDED',
	'NS_ERROR_NET_TIMEOUT',
	'Peer reports it experienced an internal error.'
]);

const step = 60;
let timeout;
let counter;
let timerID;

function stopTimer() {
	if (!timerID) return;
	processed.clear();
	clearInterval(timerID);
	timerID = false;
}

function runTimer() {
	if (!timerID) {
		counter = 0;
		timeout = 240;
		timerID = setInterval(() => {
			if (++counter >= step || !--timeout) stopTimer();
		}, 1000);
	}
	counter = 0;
}

function downgrade(url, d) {
	ignored.add(url.hostname);
	url.protocol = 'http:';
	browser.tabs.update(
		d.tabId,
		{ loadReplace: true, url: url.toString() }
	);
}

browser.webRequest.onBeforeRequest.addListener(d => {
	const url = new URL(d.url);
	if (!ignored.has(url.hostname)) {
		runTimer();
		processed.add(url.hostname);
		url.protocol = 'https:';
		return {redirectUrl: url.toString()}
	}
}, {urls: ["http://*/*"], types: ['main_frame']}, ['blocking']);

browser.webRequest.onBeforeRedirect.addListener(d => {
	const url = new URL(d.url);
	const newTarget = new URL(d.redirectUrl);
	if (url.hostname === newTarget.hostname) {
		if (newTarget.protocol === 'http:') ignored.add(url.hostname);
	} else if (processed.has(url.hostname)) {
		processed.add(newTarget.hostname);
		runTimer();
	}
}, filter);

browser.webRequest.onCompleted.addListener(d => {
	const url = new URL(d.url);
	if ( d.statusCode >= 400 && processed.has(url.hostname)
		&& !ignored.has(url.hostname) ) downgrade(url, d);
}, filter);

browser.webRequest.onErrorOccurred.addListener(d => {
	const url = new URL(d.url);
	if ( processed.has(url.hostname) && !ignored.has(url.hostname) &&
		( error_rx.test(d.error) || other_errors.has(d.error) )
	) downgrade(url, d);
	else console.info(`Error info: ${d.error}`);
}, filter);
