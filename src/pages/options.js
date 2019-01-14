'use strict';

const ui = document.getElementsByTagName('*');

function setStatus(msg, type) {
	ui.status.textContent = msg;
	ui.status.className = `shown ${type}`;
	setTimeout(() => {
		ui.status.className = 'hidden';
	}, 2500);
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
	ui.session.onchange = changePeriod;
	ui.xdays.onchange = changePeriod;
	ui.permanent.onchange = changePeriod;
	ui.clear.onclick = e => {
		browser.storage.local.set({ignored: {}}).then(() => {
			setStatus('List of sites cleared', '');
		});
	};
	ui.save.onclick = e => {
		const changes = Object.assign({}, msg);
		if (ui.xdays.checked) {
			if (!/^\d+$/.test(ui.days.value.toString())) {
				setStatus('Invalid input', 'error');
				return;
			}
			changes.ignorePeriod = +ui.days.value;
		} else if (ui.session.checked) {
			changes.ignorePeriod = 0;
			changes.ignored = {};
		} else changes.ignorePeriod = -1;
		setStatus('. . .', '');
		browser.storage.local.set(changes).then(() => {
			setStatus('Saved!', 'saved');
		});
	};
});
