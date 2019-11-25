'use strict';

const wlSaver = new DelayableAction(10, 60, () => {
	local.set({
		whitelist: sAPI.whitelist,
		incognitoWhitelist: sAPI.incognitoWhitelist
	});
});
runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.action === 'get settings') return sAPI.getAll();		// options.js
	const tabId = sender.tab ? sender.tab.id : undefined;
	switch (msg.action) {
		case 'add to whitelist':			// popup.js
			wlSaver.run();
			msg.incognito
			? sAPI.incognitoWhitelist[msg.host] = null
			: sAPI.whitelist[msg.host] = null;
			return tabs.update(tabId, {loadReplace: true, url: msg.url} );				
		case 'remove from whitelist':		// popup.js
			wlSaver.run();
			delete sAPI.whitelist[msg.host];
			delete sAPI.incognitoWhitelist[msg.host];
			return tabs.reload(tabId, {bypassCache: true} );
		case 'get tabsData URL':			// error.js, redirect.js
			return promisify({url: tabsData[tabId].url});
		case 'ignore':
			return promisify(ignore(msg.host, tabId));
		case 'content script':				// cs.js
			if (tabsData[tabId]) delete tabsData[tabId].loading;
			if (
				(processed.has(msg.host) && msg.protocol === 'https:') || 
				(isWhitelisted(msg.host) && msg.protocol === 'http:')
			) return pageAction.show(tabId);
	}
});
