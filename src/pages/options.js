'use strict';

const local = browser.storage.local;
const runtime = browser.runtime;
const ui = document.getElementsByTagName('*');
const dlpermission = { permissions: ['downloads'] };
const inputEvent = new InputEvent('input');
const ui_initialStates = {};
const ui_changes = {};
let reader;

function isChanged(p) {
	return ui_changes.hasOwnProperty(p);
}
function updateSaveButton() {
	ui.b_save.hidden = !Object.keys(ui_changes).length;
}
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
	str.split(/[\s,;]+/).forEach(e => {
		if (e.length) result[e] = null;
	});
	return result;
}
function populateWhitelist(obj) {
	const entries = [];
	for (const i in obj) entries.push(i);
	return entries.join('; ');
}
function refreshUI(data) {
	if (data.hasOwnProperty('autoDowngrade')) ui.i_autoDowngrade.checked = data.autoDowngrade;
	if (data.hasOwnProperty('honorPB')) ui.i_honorPB.checked = data.honorPB;
	if (data.hasOwnProperty('ignorePeriod')) {
		ui.i_session.checked = !data.ignorePeriod;
		ui.i_xdays.checked = data.ignorePeriod > 0;
		ui.i_days.disabled = !ui.i_xdays.checked;
		ui.i_permanent.checked = data.ignorePeriod === -1;
		ui.i_days.value = data.ignorePeriod;
		ui.i_proxyCompat.checked = data.proxyCompat;
		ui.i_interceptRedirects.checked = data.interceptRedirects;
		ui.i_NSRedirectionsFix.checked = data.NSRedirectionsFix;
	}
	if (data.hasOwnProperty('maxWait')) ui.i_maxWait.value = data.maxWait;
	if (data.hasOwnProperty('rememberSecureSites')) ui.i_rememberSecureSites.checked = data.rememberSecureSites;
	if (data.hasOwnProperty('whitelist')) {
		ui.t_whitelist.value = populateWhitelist(data.whitelist);
		ui.t_whitelist.dispatchEvent(inputEvent);
	}
}
function recordUIstate(hideSave = true) {
	for (const ele of ui) {
		if (ele.type === 'checkbox') {
			ui_initialStates[ele.id] = ele.checked;
		} else if (ele.type && ele.type.startsWith('text')) {
			ui_initialStates[ele.id] = ele.value;
		} else if (ele.type === 'radio') {
			if (ele.checked) ui_initialStates[ele.name] = ele.value;
		}
		delete ui_changes[(ele.name || ele.id)];
	}
	if (hideSave) ui.b_save.hidden = true;
}
function setStatus(button, success) {
	button.disabled = false;
	const attrib = success ? 'sstatus-timer' : 'fstatus-timer';
	const symbol = success ? '✓' : '✖';
	button.setAttribute(attrib, 4);
	if (!button.hasAttribute('tcont')) button.setAttribute('tcont', button.textContent);
	button.textContent = symbol;
	let count = 4;
	return new Promise(resolve => {
		const counter = setInterval(() => {
			const temp = button.getAttribute(attrib);
			if (count < temp) return clearInterval(counter);
			count = temp - 1;
			if (count < 1) {
				button.textContent = button.getAttribute('tcont');
				button.removeAttribute(attrib);
				clearInterval(counter);
				resolve(true);
			} else button.setAttribute(attrib, count);
		}, 1000);
	});
}

runtime.sendMessage({action: 'get settings'}).then(msg => {
	refreshUI(msg);
	recordUIstate();
});
const changeTab = e => {
	const ele = e.target;	
	ui.d_general.hidden = !(ele.id === 'b_general');
	ui.b_general.disabled = ele.id === 'b_general';
	ui.d_advanced.hidden = !(ele.id === 'b_advanced');
	ui.b_advanced.disabled = ele.id === 'b_advanced';
};
ui.b_general.addEventListener('click', changeTab);
ui.b_advanced.addEventListener('click', changeTab);

const makeHandler = attr => e => {
	const ele = e.target;
	const p = ele.name || ele.id;
	if (ui_initialStates[p] === ele[attr])
		delete ui_changes[p];
	else ui_changes[p] = ele[attr];
	updateSaveButton();
};
const checkedChangeHandler = makeHandler('checked');
const valueChangeHandler = makeHandler('value');
const maybeAddLabel = ele => {
	if (getComputedStyle(ele, null).display === 'none') {
		const label = document.createElement('label');
		label.setAttribute('for', ele.id);
		ele.parentNode.insertBefore(label, ele.nextSibling);
	}
};
for (const ele of ui) {
	if (ele.type === 'checkbox') {
		ele.addEventListener('change', checkedChangeHandler);
		maybeAddLabel(ele);
	} else if (ele.type === 'radio' || ele.type && ele.type.startsWith('text')) {
		ele.addEventListener('change', valueChangeHandler);
		maybeAddLabel(ele);
	}
}
const handlePeriodChange = e => {
	ui.i_days.disabled = !ui.i_xdays.checked;
	if (!ui.i_days.value) ui.i_days.value = 7;
};
const handleTextClick = e => {
	e.target.select();
};
ui.i_days.addEventListener('click', handleTextClick);
ui.i_maxWait.addEventListener('click', handleTextClick);
ui.i_session.addEventListener('change', handlePeriodChange);
ui.i_xdays.addEventListener('change', handlePeriodChange);
ui.i_permanent.addEventListener('change', handlePeriodChange);
ui.i_rememberSecureSites.addEventListener('change', e => {
	if (!e.target.checked) {
		if (confirm('Do you also want to clear the list of secure sites?\n\n(Click \'Cancel\' if you plan to re-enable this feature later on)')) ui_changes.clearSecure = true;
		else delete ui_changes.clearSecure;
		updateSaveButton();
	}
});
ui.b_clearIgnored.addEventListener('click', e => {
	if (confirm('Are you sure you want to clear the ignore list?')) {
		local.set({ignored: {}}).then(() => {
			setStatus(ui.b_clearIgnored, true);
		});
		runtime.sendMessage({
			action: 'update sAPI',
			data: {ignored_pb: {}}
		});
	}
});
ui.b_fakeFileInput.addEventListener('click', e => {
	ui.i_import.click();
});
ui.i_import.addEventListener('change', e => {
	if (!reader) {
		reader = new FileReader();
		reader.onloadend = () => {
			try {
				const data = JSON.parse(reader.result);
				if (data.hasOwnProperty('ignorePeriod')) {
					local.set(data);
					refreshUI(data);
					recordUIstate(true);
					setStatus(ui.b_fakeFileInput, true);
				} else throw 'error';
			} catch (ex) {
				setStatus(ui.b_fakeFileInput, false);
				alert('The file seems to be invalid');
			};
		};
	}
	ui.b_fakeFileInput.disabled = true;
	reader.readAsText(ui.i_import.files[0]);
});
ui.b_clearWhitelist.addEventListener('click', e => {
	if (confirm('Are you sure you want to clear the whitelist?')) {
		local.set({whitelist: {}, incognitoWhitelist: {}}).then(() => {
			ui.t_whitelist.value = '';
			ui_initialStates.t_whitelist = '';
			delete ui_changes.t_whitelist;
			ui.t_whitelist.dispatchEvent(inputEvent);
			updateSaveButton();
			setStatus(ui.b_clearWhitelist, true);
		});
	}
});
ui.b_save.addEventListener('click', e => {
	ui.b_save.disabled = true;
	const changes = {};
	if (
		isChanged('i_xdays') ||
		isChanged('i_session') ||
		isChanged('i_permanent') ||
		isChanged('i_days')
	) {
		if (ui.i_xdays.checked) {
			if (!ui.i_days.reportValidity()) {
				setStatus(ui.b_save, false);
				return;
			}
			changes.ignorePeriod = +ui.i_days.value;
		} else if (ui.i_session.checked) changes.ignorePeriod = 0;
		else changes.ignorePeriod = -1;
	}
	if (isChanged('i_maxWait')) {
		if (ui.i_maxWait.reportValidity()) {
			changes.maxWait = +ui.i_maxWait.value;
		} else {
			setStatus(ui.b_save, false);
			return;
		}
	}
	if (isChanged('i_autoDowngrade')) changes.autoDowngrade = ui.i_autoDowngrade.checked;
	if (isChanged('i_honorPB')) changes.honorPB = ui.i_honorPB.checked;
	if (isChanged('i_rememberSecureSites')) changes.rememberSecureSites = ui.i_rememberSecureSites.checked;
	if (isChanged('clearSecure')) {
		changes.knownSecure = {};
		runtime.sendMessage({
			action: 'update sAPI',
			data: {knownSecure_pb: {}}
		});
		delete ui_changes.clearSecure;
	}
	if (isChanged('t_whitelist')) changes.whitelist = parseWhitelist(ui.t_whitelist.value);
	if (isChanged('i_proxyCompat')) changes.proxyCompat = ui.i_proxyCompat.checked;
	if (isChanged('i_interceptRedirects')) changes.interceptRedirects = ui.i_interceptRedirects.checked;
	if (isChanged('i_NSRedirectionsFix')) changes.NSRedirectionsFix = ui.i_NSRedirectionsFix.checked;
	local.set(changes).then(() => {
		setStatus(ui.b_save, true).then(() => {
			updateSaveButton();
		});;
		recordUIstate(false);
	});
});
browser.permissions.contains(dlpermission).then(r => {
	if (r) ui.b_export.onclick = e => {exportSettings()};
	else ui.b_export.onclick = async e => {
		if (await browser.permissions.request(dlpermission)) {
			exportSettings();
			ui.b_export.onclick = e => {exportSettings()};
		}
	};
});
ui.t_whitelist.setAttribute('style', 'height:' + ui.t_whitelist.scrollHeight + 'px;overflow-y:hidden;');
ui.t_whitelist.addEventListener('input', e => {
	const ele = e.target;
	ele.style.height = 'auto';
	ele.style.height = ele.scrollHeight + 'px';
	if (ui.b_save.hidden) ui.b_save.hidden = false;
}, false);
