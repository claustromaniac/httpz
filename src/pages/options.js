'use strict';

const ui = document.getElementsByTagName('*');
const dlpermission = { permissions : ['downloads'] };
let reader;

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
	str.split(/[\s,]+/).forEach(e => {
		if (e.length) result[e] = true;
	});
	return result;
}

function refreshUI(data) {
	ui.session.checked = !data.ignorePeriod;
	ui.xdays.checked = data.ignorePeriod > 0;
	ui.days.disabled = !ui.xdays.checked;
	ui.permanent.checked = data.ignorePeriod === -1;
	if (ui.xdays.checked) ui.days.value = data.ignorePeriod;
	ui.rememberSecureSites.checked = data.rememberSecureSites;
	ui.whitelist.value = populateWhitelist(data.whitelist);
}

function exportSettings() {
	browser.storage.local.get().then(r => {
		browser.downloads.download({
			saveAs : true,
			url : URL.createObjectURL(new Blob([JSON.stringify(r, null, '\t')])),
			filename : `HTTPZ_backup-${new Date().toISOString().replace(/.*?(\d.*\d).*/, '$1').replace(/\D/g, '.')}.json`
		});
	});
}

browser.runtime.sendMessage('options').then(msg => {
	const changePeriod = e => {
		ui.days.disabled = !ui.xdays.checked;
		if (ui.xdays.checked) {
			ui.days.value = msg.ignorePeriod > 0 ? msg.ignorePeriod : 1;
		}
	};
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
	ui.clearWhitelist.onclick = e => {
		browser.storage.local.set({whitelist: {}, incognitoWhitelist: {}}).then(() => {
			ui.whitelist.value = '';
			setStatus(ui.clearWhitelist, '✔', 'status-success');
		});
	};
	ui.import.onchange = e => {
		if (!reader) reader = new FileReader();
		reader.onloadend = () => {
			try {
				const data = JSON.parse(reader.result);
				if (data.hasOwnProperty('ignorePeriod')) {
					browser.storage.local.set(data);
					refreshUI(data);
				} else throw 'SyntaxError';
			} catch {alert('Error. Invalid file (?)')};
		};
		reader.readAsText(ui.import.files[0]);
	};
	ui.clearWhitelist.onclick = e => {
		browser.storage.local.set({whitelist: {}, incognitoWhitelist: {}}).then(() => {
			ui.whitelist.value = '';
			setStatus(ui.clearWhitelist, '✔', 'status-success');
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
	browser.permissions.contains(dlpermission).then(r => {
		if (r) ui.export.onclick = e => {exportSettings()};
		else ui.export.onclick = async e => {
			if (await browser.permissions.request(dlpermission)) {
				exportSettings();
				ui.export.onclick = e => {exportSettings()};
			}
		};
	});
	refreshUI(msg);
});
