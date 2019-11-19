'use strict';

const ui = document.getElementsByTagName('*');

browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
	const tab = tabs[0];
	const url = new URL(tab.url);
	if (url.protocol === 'https:') {
		ui.info.textContent = `${url.hostname} was redirected to HTTPS. If you click the button below, this site will be added to the whitelist and the tab will be reloaded in HTTP.`;
		ui.whitelist.textContent = 'add to whitelist';
		const incognito = browser.extension.inIncognitoContext;
		if (incognito) ui.incognito.textContent = 'Note: sites added to the whitelist from a private window will not be visible in the options page';
		ui.whitelist.onclick = e => {
			ui.whitelist.disabled = true;
			url.protocol = 'http:';
			browser.runtime.sendMessage({
				host: url.hostname,
				tabId: tab.id,
				url: url.toString(),
				value: incognito ? 2 : 1
			});
		};
	} else {
		ui.info.textContent = `HTTPZ did not try to redirect ${url.hostname} to HTTPS because it is in the whitelist. If you click the button below, this site will be removed from the whitelist and the tab will be reloaded in HTTPS.`;
		ui.whitelist.textContent = 'remove from whitelist';
		ui.whitelist.onclick = e => {
			ui.whitelist.disabled = true;
			browser.runtime.sendMessage({
				host: url.hostname, 
				tabId: tab.id,
				value: false
			});
		};
	}
});
