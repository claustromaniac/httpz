'use strict';

const ui = document.getElementsByTagName('*');

browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
	const tab = tabs[0];
	const url = new URL(tab.url);
	const target = new URL(url.searchParams.get('target'));
	ui.hostname.textContent = target.hostname;
	ui.continue.onclick = e => {
		ui.continue.disabled = true;
		browser.runtime.sendMessage({ignore: target.hostname}).then(() => {
			target.protocol = 'http:';
			browser.tabs.update(tab.id, {loadReplace: true, url: target.toString()});
		});
	};
});
