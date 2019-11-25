'use strict';

const ui = document.getElementsByTagName('*');

browser.runtime.sendMessage({action: 'get tabsData URL'}).then(msg => {
	if (!msg.url) return;
	ui.retry.disabled = false;
	ui.continue.disabled = false;
	const url = new URL(msg.url);
	ui.hostname.textContent = url.hostname;
	ui.abbr.title = msg.url;
	ui.continue.onclick = e => {
		ui.retry.disabled = true;
		ui.continue.disabled = true;
		browser.runtime.sendMessage({
			action: 'ignore',
			host: url.hostname
		}).then(() => {
			location.href = msg.url.replace(/^https:/, 'http:');
		});
	};
	ui.retry.onclick = e => {
		ui.retry.disabled = true;
		ui.continue.disabled = true;
		location.href = msg.url;
	};
});
