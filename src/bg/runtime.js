'use strict';

const wlSaver = new DelayableAction(10, 60, () => {
	local.set({
		whitelist: sAPI.whitelist,
		incognitoWhitelist: sAPI.incognitoWhitelist
	});
});
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg === 'options') return sAPI.getAll(); // options.js
	return (async () => {
		// popup.js
		if (msg.value) {
			wlSaver.run();
			if (msg.value === 2) return sAPI.incognitoWhitelist[msg.host] = null;
			return sAPI.whitelist[msg.host] = null;
		} else if (msg.host) {
			wlSaver.run();
			return delete sAPI.whitelist[msg.host] &&
			delete sAPI.incognitoWhitelist[msg.host];
		} else if (msg.ignore) { // error.js
			ignore(msg.ignore);
			return true;
		}
	})();
});
