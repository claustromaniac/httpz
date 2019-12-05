'use strict';

const ui = document.getElementsByTagName('*');

browser.runtime.sendMessage({action: 'get tabsData URL'}).then(msg => {
	if (!msg.url) return;
	ui.continue.disabled = false;
	const url = new URL(msg.url);
	ui.host.textContent = url.hostname;
	ui.host.setAttribute('data-info', msg.url);
	ui.continue.onclick = e => {
		ui.continue.disabled = true;
		browser.runtime.sendMessage({
			action: 'ignore',
			host: url.hostname
		}).then(() => {
			location.href = msg.url.replace(/^https:/, 'http:');
		});
	};
});
