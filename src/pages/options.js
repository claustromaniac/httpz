'use strict';

const local = browser.storage.local;
const ui = document.getElementsByTagName('*');
const dlpermission = { permissions : ['downloads'] };
let reader;

function exportSettings() {
	local.get().then(r => {
		browser.downloads.download({
			saveAs : true,
			url : URL.createObjectURL(new Blob([JSON.stringify(r, null, '\t')])),
			filename : `HTTPZ_backup-${new Date().toISOString().replace(/.*?(\d.*\d).*/, '$1').replace(/\D/g, '.')}.json`
		});
	});
}

function parseWhitelist(str) {
	const result = {};
	str.split(/[\s,]+/).forEach(e => {
		if (e.length) result[e] = null;
	});
	return result;
}

function populateWhitelist(obj) {
	const entries = [];
	for (const i in obj) entries.push(i);
	return entries.join('\n');
}

function refreshUI(data) {
	if (data.hasOwnProperty('autoDowngrade')) ui.autoDowngrade.checked = data.autoDowngrade;
	if (data.hasOwnProperty('honorPB')) ui.honorPB.checked = data.honorPB;
	if (data.hasOwnProperty('ignorePeriod')) {
		ui.session.checked = !data.ignorePeriod;
		ui.xdays.checked = data.ignorePeriod > 0;
		ui.days.disabled = !ui.xdays.checked;
		ui.permanent.checked = data.ignorePeriod === -1;
		ui.days.value = data.ignorePeriod;
		ui.proxyCompat.checked = data.proxyCompat;
		ui.interceptRedirects.checked = data.interceptRedirects;
		ui.NSRedirectionsFix.checked = data.NSRedirectionsFix;
	}
	if (data.hasOwnProperty('maxWait')) ui.maxWait.value = data.maxWait;
	if (data.hasOwnProperty('rememberSecureSites')) ui.rememberSecureSites.checked = data.rememberSecureSites;
	if (data.hasOwnProperty('whitelist')) ui.whitelist.value = populateWhitelist(data.whitelist);
}

function setStatus(button, success) {
	button.disabled = false;
	const attrib = success ? 'sstatus-timer' : 'fstatus-timer';
	const symbol = success ? '✓' : '✖';
	button.setAttribute(attrib, 4);
	if (!button.hasAttribute('tcont')) button.setAttribute('tcont', button.textContent);
	button.textContent = symbol;
	let count = 4;
	const counter = setInterval(() => {
		const temp = button.getAttribute(attrib);
		if (count < temp) return clearInterval(counter);
		count = temp - 1;
		if (count < 1) {
			button.textContent = button.getAttribute('tcont');
			button.removeAttribute(attrib);
			clearInterval(counter);
		} else button.setAttribute(attrib, count);
	}, 1000);
}

browser.runtime.sendMessage({action: 'get settings'}).then(msg => {
	let clearSecure;
	const changePeriod = e => {
		ui.days.disabled = !ui.xdays.checked;
		if (!ui.days.value) ui.days.value = 7;
	};
	ui.session.onchange = changePeriod;
	ui.xdays.onchange = changePeriod;
	ui.permanent.onchange = changePeriod;
	ui.rememberSecureSites.onchange = e => {
		if (!e.target.checked && confirm('Do you also want to clear the list of secure sites?\n\n(Click \'Cancel\' if you plan to re-enable this later on)')) {
			clearSecure = true;
		}
	};
	ui.clearIgnored.onclick = e => {
		local.set({ignored: {}}).then(() => {
			setStatus(ui.clearIgnored, true);
		});
	};
	ui.clearWhitelist.onclick = e => {
		local.set({whitelist: {}, incognitoWhitelist: {}}).then(() => {
			ui.whitelist.value = '';
			setStatus(ui.clearWhitelist, true);
		});
	};
	ui.fakeFileInput.onclick = e => {
		ui.import.click();
	};
	ui.import.onchange = e => {
		if (!reader) {
			reader = new FileReader();
			reader.onloadend = () => {
				try {
					const data = JSON.parse(reader.result);
					if (data.hasOwnProperty('ignorePeriod')) {
						local.set(data);
						refreshUI(data);
						setStatus(ui.fakeFileInput, true);
					} else throw 'SyntaxError';
				} catch (ex) {
					setStatus(ui.fakeFileInput, false);
					alert('Error. Invalid file (?)');
				};
			};
		}
		ui.fakeFileInput.disabled = true;
		reader.readAsText(ui.import.files[0]);
	};
	ui.clearWhitelist.onclick = e => {
		local.set({whitelist: {}, incognitoWhitelist: {}}).then(() => {
			ui.whitelist.value = '';
			setStatus(ui.clearWhitelist, true);
		});
	};
	ui.save.onclick = e => {
		ui.save.disabled = true;
		const changes = {};
		if (ui.xdays.checked) {
			if (!ui.days.reportValidity()) {
				setStatus(ui.save, false);
				return;
			}
			changes.ignorePeriod = +ui.days.value;
		} else if (ui.session.checked) {
			if (msg.ignorePeriod !== 0) {
				msg.ignorePeriod = 0;
				changes.ignorePeriod = 0;
			}
		} else changes.ignorePeriod = -1;
		if (ui.maxWait.reportValidity()) {
			changes.maxWait = +ui.maxWait.value;
		} else {
			setStatus(ui.save, false);
			return;
		}
		changes.autoDowngrade = ui.autoDowngrade.checked;
		changes.honorPB = ui.honorPB.checked;
		changes.rememberSecureSites = ui.rememberSecureSites.checked;
		if (clearSecure) {
			changes.knownSecure = {};
			clearSecure = false;
		}
		changes.whitelist = parseWhitelist(ui.whitelist.value);
		changes.proxyCompat = ui.proxyCompat.checked;
		changes.interceptRedirects = ui.interceptRedirects.checked;
		changes.NSRedirectionsFix = ui.NSRedirectionsFix.checked;
		local.set(changes).then(() => {
			setStatus(ui.save, true);
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
