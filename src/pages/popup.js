'use strict';

const tabs = browser.tabs;
const ui = document.getElementsByTagName('*');
const sendMessage = browser.runtime.sendMessage;
const incognito = browser.extension.inIncognitoContext;

tabs.query({active: true, currentWindow: true}).then(tabs_array => {
	const tab = tabs_array[0];
	const url = new URL(tab.url);

	const addToWhitelist = async e => {
		ui.b_whitelist.disabled = true;
		url.protocol = 'http:';
		await sendMessage({
			action: 'add to whitelist',
			host: url.hostname,
			incognito: incognito
		});
		tabs.update(
			tab.id,
			{loadReplace: true, url: url.toString()}
		);
		close();
	};
	const removeFromWhitelist = async e => {
		ui.b_whitelist.disabled = true;
		await sendMessage({
			action: 'remove from whitelist',
			host: url.hostname
		});
		if (ui.reasons.style.display === 'block')
			browser.pageAction.hide(tab.id);
		else tabs.reload(
				tab.id,
				{bypassCache: true}
			);
		close();
	};

	if (url.protocol === 'https:') {
		sendMessage({
			action: 'isWhitelisted',
			host: url.hostname
		}).then(r => {
			if (r) {
				ui.info.textContent = `HTTPZ did not redirect ${url.hostname} to HTTPS, because it is in the list of exclusions\n\nThat it was loaded over HTTPS most likely means one of the following:`;
				ui.reasons.style.display = 'block';
				ui.b_whitelist.textContent = 'Remove from exclusions';
				ui.b_whitelist.onclick = removeFromWhitelist;
			} else {
				ui.info.textContent = `HTTPZ redirected http://${url.hostname}/ to HTTPS\n\nIf the page does not seem to work well over HTTPS, you can attempt to reload it over HTTP and exclude the site from future redirections`;
				ui.b_whitelist.textContent = 'Add to exclusions';
				if (incognito) ui.incognito.style.display = 'block';
				ui.b_whitelist.onclick = addToWhitelist;
			}
		});
	} else {
		ui.info.textContent = `HTTPZ did not try to redirect http://${url.hostname}/ to HTTPS because it is in the list of exclusions\n\nIf you click the button below, this site will be removed from that list and the tab will be reloaded`;
		ui.b_whitelist.textContent = 'Remove from exclusions';
		ui.b_whitelist.onclick = removeFromWhitelist;
	}
});
