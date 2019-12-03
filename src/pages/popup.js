'use strict';

const ui = document.getElementsByTagName('*');

browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
	const tab = tabs[0];
	const url = new URL(tab.url);
	if (url.protocol === 'https:') {
		ui.info.textContent = `${url.hostname} was redirected to HTTPS. If you click the button below, HTTPZ will add this site to the list of exclusions and will attempt to reload it over HTTP`;
		ui.whitelist.textContent = 'Add to exclusions';
		const incognito = browser.extension.inIncognitoContext;
		if (incognito) ui.incognito.textContent = 'Note: sites excluded from a private window will not be visible in the options page';
		ui.whitelist.onclick = e => {
			ui.whitelist.disabled = true;
			url.protocol = 'http:';
			browser.runtime.sendMessage({
				action: 'add to whitelist',
				host: url.hostname,
				incognito: incognito,
				url: url.toString()
			}).then(() => {close();});
		};
	} else {
		ui.info.textContent = `HTTPZ did not try to redirect ${url.hostname} to HTTPS because it is in the list of exclusions. If you click the button below, this site will be removed from that list and the tab will be reloaded`;
		ui.whitelist.textContent = 'Remove from exclusions';
		ui.whitelist.onclick = e => {
			ui.whitelist.disabled = true;
			browser.runtime.sendMessage({
				action: 'remove from whitelist',
				host: url.hostname
			}).then(() => {close();});
		};
	}
});
