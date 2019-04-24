'use strict';

const ui = document.getElementsByTagName('*');

browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
	const tab = tabs[0];
	const url = new URL(tab.url);
	if (url.protocol === 'https:') {
		ui.info.textContent = `${url.hostname} was redirected to HTTPS. If you click the button below, this site will be added to the whitelist and the tab will be reloaded in HTTP.`;
		ui.whitelist.textContent = 'add to whitelist';
		ui.whitelist.onclick = e => {
			ui.whitelist.disabled = true;
			browser.windows.getLastFocused().then(w => {
				browser.runtime.sendMessage({host: url.hostname, value: w.incognito ? 2 : 1}).then(() => {
					url.protocol = 'http:';
					browser.tabs.update(
						tab.id,
						{ loadReplace: true, url: url.toString() }
					);
				});
			});
		};
	} else {
		ui.info.textContent = `HTTPZ did not try to redirect ${url.hostname} to HTTPS because it is in the whitelist. If you click the button below, this site will be removed from the whitelist and the tab will be reloaded in HTTPS.`;
		ui.whitelist.textContent = 'remove from whitelist';
		ui.whitelist.onclick = e => {
			ui.whitelist.disabled = true;
			browser.runtime.sendMessage({host: url.hostname, value: false}).then(() => {
				browser.tabs.reload(tab.id);
			});
		};
	}
});
