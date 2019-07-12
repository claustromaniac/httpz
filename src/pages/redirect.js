'use strict';

const ui = document.getElementsByTagName('*');

browser.runtime.sendMessage({getRedirUrl: true}).then(msg => {
	if (!msg.redirectUrl) return;
	ui.continue.disabled = false;
	ui.url.textContent = msg.url;
	ui.redirectUrl.textContent = msg.redirectUrl;
	ui.continue.onclick = e => {
		ui.continue.disabled = true;
		url = new URL(msg.url);
		redirectUrl = new URL(msg.redirectUrl);
		browser.runtime.sendMessage({ignore: url.hostname}).then(() => {
			location.href = msg.url;
		});
	};
});
