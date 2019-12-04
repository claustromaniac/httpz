'use strict';

const wlSaver = new DelayableAction(10, 60, () => {
	local.set({
		whitelist: sAPI.whitelist,
		incognitoWhitelist: sAPI.incognitoWhitelist
	});
});
runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
	const tabId = sender.tab ? sender.tab.id : undefined;
	switch (msg.action) {
		case 'get settings':				// options.js
			return sAPI.getAll();
		case 'update sAPI':					// options.js
			for (const i in msg.data) sAPI[i] = msg.data[i]
			return;
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
			return {url: tabsData[tabId].url};
		case 'get error code':			// error.js
			return {error: tabsData[tabId].error};
		case 'ignore':
			return ignore(msg.host, tabId);
		case 'content script':				// cs.js
			if (tabsData[tabId]) delete tabsData[tabId].loading;
			await sAPI.loading;
			if (
				processed.has(msg.host) && msg.protocol === 'https:' ||
				isWhitelisted(msg.host) && msg.protocol === 'http:'
			) return pageAction.show(tabId);
	}
});
