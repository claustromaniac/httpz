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
			if (msg.value === 2) sAPI.incognitoWhitelist[msg.host] = null;
			else sAPI.whitelist[msg.host] = null;
			tabs.update( msg.tabId, {loadReplace: true, url: msg.url} );
		} else if (msg.host) {
			wlSaver.run();
			delete sAPI.whitelist[msg.host];
			delete sAPI.incognitoWhitelist[msg.host];
			tabs.reload( msg.tabId, {bypassCache: true} );
		} else if (msg.getUrl) { // error.js, redirect.js
			const id = sender.tab.id;
			return {url: tabsData[id].url};
		} else if (msg.ignore) {
			ignore(msg.ignore, sender.tab.id);
			return true;
		} else if (msg.tabLoaded) { // cs.js
			if (tabsData[sender.tab.id]) delete tabsData[sender.tab.id].loading;
		}
	})();
});
