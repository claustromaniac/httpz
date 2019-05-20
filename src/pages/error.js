'use strict';

const ui = document.getElementsByTagName('*');

browser.tabs.getCurrent().then(tab => {
	const url = new URL(tab.url);
	const target = new URL(url.searchParams.get('target'));
	ui.hostname.textContent = target.hostname;
	ui.continue.onclick = e => {
		ui.retry.disabled = true;
		ui.continue.disabled = true;
		browser.runtime.sendMessage({ignore: target.hostname}).then(() => {
			target.protocol = 'http:';
			browser.tabs.update(tab.id, {loadReplace: true, url: target.toString()});
		});
	};
	ui.retry.onclick = e => {
		ui.retry.disabled = true;
		ui.continue.disabled = true;
		browser.tabs.update(tab.id, {loadReplace: true, url: target.toString()});
	};
});
