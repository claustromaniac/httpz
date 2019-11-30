'use strict';

const runtime = browser.runtime;
const ui = document.getElementsByTagName('*');

runtime.sendMessage({action: 'get error code'}).then(msg => {
	if (!msg.error) return;
	ui.error.value = msg.error;
});
runtime.sendMessage({action: 'get tabsData URL'}).then(msg => {
	if (!msg.url) return;
	ui.retry.disabled = false;
	ui.continue.disabled = false;
	const url = new URL(msg.url);
	ui.host.textContent = url.hostname;
	ui.host.setAttribute('data-info', msg.url);
	ui.continue.onclick = e => {
		ui.retry.disabled = true;
		ui.continue.disabled = true;
		runtime.sendMessage({
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
