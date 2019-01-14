'use strict';

const ui = document.getElementsByTagName('*');

browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
	const tab = tabs[0];
	const url = new URL(tab.url);
	if (url.protocol === 'https:') {
		ui.info.textContent = `${url.hostname} was automatically redirected to HTTPS. Click the button below to whitelist this site and reload the tab in HTTP.`;
		ui.whitelist.textContent = 'whitelist';
		ui.whitelist.onclick = e => {
			ui.whitelist.disabled = true;
			browser.runtime.sendMessage({host: url.hostname, value: true}).then(() => {
				url.protocol = 'http:';
				browser.tabs.update(
					tab.id,
					{ loadReplace: true, url: url.toString() }
				);
			});
		};
	} else {
		ui.info.textContent = `HTTPZ did not try to redirect ${url.hostname} to HTTPS because it is in the whitelist. Click the button below to remove this site from the whitelist and attempt to reload the tab in HTTPS.`;
		ui.whitelist.textContent = 'remove from whitelist';
		ui.whitelist.onclick = e => {
			ui.whitelist.disabled = true;
			browser.runtime.sendMessage({host: url.hostname, value: false}).then(() => {
				browser.tabs.reload(tab.id);
			});
		};
	}
});
