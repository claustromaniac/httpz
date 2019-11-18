'use strict';

const ui = document.getElementsByTagName('*');

browser.runtime.sendMessage({getUrl: true}).then(msg => {
	if (!msg.url) return;
	ui.continue.disabled = false;
	const url = new URL(msg.url);
	ui.host.textContent = url.hostname;
	ui.abbr.title = msg.url;
	ui.continue.onclick = e => {
		ui.continue.disabled = true;
		url.protocol = 'http:';
		browser.runtime.sendMessage({ignore: url.hostname}).then(() => {
			location.href = msg.url;
		});
	};
});
