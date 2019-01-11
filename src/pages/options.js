'use strict';

var settings;

const ui = (() => {
  const dom = document.getElementsByTagName('*');
  return new Proxy(dom, {
	get: function(obj, prop) {
	  return obj[prop];
	},
	set: function(obj, prop, val) {
		obj[prop].value = val;
		return true;
	}
  });
})();

function setStatus(msg, type) {
	ui.status.textContent = msg;
	ui.status.className = `shown ${type}`;
	setTimeout(() => {
		ui.status.className = 'hidden';
	}, 2500);
}

browser.runtime.sendMessage(true).then(msg => {
	settings = msg;
	ui.session.checked = !msg.ignorePeriod;
	ui.xdays.checked = msg.ignorePeriod > 0;
	ui.days.disabled = !ui.xdays.checked;
	ui.permanent.checked = msg.ignorePeriod === -1;
	if (ui.xdays.checked) ui.days.value = msg.ignorePeriod;
	const changePeriod = e => {
		ui.days.disabled = !ui.xdays.checked;
		if (ui.xdays.checked) {
			ui.days.value = settings.ignorePeriod > 0 ? settings.ignorePeriod : 1;
		}
	};
	ui.session.onchange = changePeriod;
	ui.xdays.onchange = changePeriod;
	ui.permanent.onchange = changePeriod;
	ui.clear.onclick = e => {
		browser.storage.local.set({ignored: {}}).then(() => {;
			setStatus('List of sites cleared', '');
		});
	};
	ui.save.onclick = e => {
		if (ui.session.checked) {
			settings.ignorePeriod = 0;
			settings.ignored = {};
		} else if (ui.xdays.checked) {
			if (!/^\d+$/.test(ui.days.value.toString())) {
				setStatus('Invalid input', 'error');
				return;
			}
			settings.ignorePeriod = +ui.days.value;
		} else settings.ignorePeriod = -1;
		setStatus('. . .', '');
		browser.storage.local.set(settings)
		.then(() => {
			setStatus('Saved!', 'saved');
		});
	};
});
