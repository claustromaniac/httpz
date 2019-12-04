'use strict';

const ui = document.getElementsByTagName('*');

browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
	const tab = tabs[0];
	const url = new URL(tab.url);
	if (url.protocol === 'https:') {
		ui.info.textContent = `HTTPZ redirected http://${url.hostname}/ to HTTPS.\n\nIf the page does not seem to work well over HTTPS, you can attempt to reload it over HTTP and exclude the site from future redirections.`;
		ui.whitelist.textContent = 'Add to exclusions';
		const incognito = browser.extension.inIncognitoContext;
		if (incognito) {
			ui.incognito.textContent = 'Note: sites excluded from a Private Browsing window will not be visible in the options page';
			ui.incognito.style.display = 'block';
		}
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
		ui.info.textContent = `HTTPZ did not try to redirect http://${url.hostname}/ to HTTPS because it is in the list of exclusions.\n\nIf you click the button below, this site will be removed from that list and the tab will be reloaded`;
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
