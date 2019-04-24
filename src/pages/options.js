'use strict';

const ui = document.getElementsByTagName('*');

function setStatus(button, msg, type) {
	button.setAttribute(type, ` ${msg}`);
	button.setAttribute(`${type}-count`, 4);
	let count = 4;
	const counter = setInterval(() => {
		const temp = button.getAttribute(`${type}-count`);
		if (count < temp) return clearInterval(counter);
		count = temp - 1;
		if (count < 1) {
			button.removeAttribute(type);
			button.removeAttribute(`${type}-count`);
			clearInterval(counter);
		} else button.setAttribute(`${type}-count`, count);
	}, 1000);
}

function populateWhitelist(obj) {
	const entries = [];
	for (const i in obj) entries.push(i);
	return entries.join('\n');
}

function parseWhitelist(str) {
	const result = {};
	str.split(/\s+/).forEach(e => {
		if (e.length) result[e] = true;
	});
	return result;
}

browser.runtime.sendMessage('options').then(msg => {
	ui.session.checked = !msg.ignorePeriod;
	ui.xdays.checked = msg.ignorePeriod > 0;
	ui.days.disabled = !ui.xdays.checked;
	ui.permanent.checked = msg.ignorePeriod === -1;
	if (ui.xdays.checked) ui.days.value = msg.ignorePeriod;
	const changePeriod = e => {
		ui.days.disabled = !ui.xdays.checked;
		if (ui.xdays.checked) {
			ui.days.value = msg.ignorePeriod > 0 ? msg.ignorePeriod : 1;
		}
	};
	ui.rememberSecureSites.checked = msg.rememberSecureSites;
	ui.whitelist.value = populateWhitelist(msg.whitelist);
	ui.session.onchange = changePeriod;
	ui.xdays.onchange = changePeriod;
	ui.permanent.onchange = changePeriod;
	ui.clearIgnored.onclick = e => {
		browser.storage.local.set({ignored: {}}).then(() => {
			setStatus(ui.clearIgnored, '✔', 'status-success');
		});
	};
	ui.clearSecure.onclick = e => {
		browser.storage.local.set({knownSecure: {}}).then(() => {
			setStatus(ui.clearSecure, '✔', 'status-success');
		});
	};
	ui.save.onclick = e => {
		const changes = Object.assign({}, msg);
		if (ui.xdays.checked) {
			if (!/^[1-9][0-9]*$/.test(ui.days.value.toString())) {
				setStatus(ui.save, '❌', 'status-failure');
				return;
			}
			changes.ignorePeriod = +ui.days.value;
		} else if (ui.session.checked) {
			changes.ignorePeriod = 0;
			changes.ignored = {};
		} else changes.ignorePeriod = -1;
		changes.whitelist = parseWhitelist(ui.whitelist.value);
		changes.rememberSecureSites = ui.rememberSecureSites.checked;
		setStatus(ui.save, '⭕', 'status-neutral');
		browser.storage.local.set(changes).then(() => {
			setStatus(ui.save, '✔', 'status-success');
		});
	};
});
