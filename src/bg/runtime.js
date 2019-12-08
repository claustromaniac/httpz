'use strict';

const wlSaver = new DelayableAction(10, 60, () => {
	local.set({
		whitelist: sAPI.whitelist,
		incognitoWhitelist: sAPI.incognitoWhitelist
	});
});
runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
	const tabId = sender.tab ? sender.tab.id : undefined;
	const tabData = tabId ? (await tabsData.get(tabId)) : undefined;
	switch (msg.action) {
		case 'content script':				// cs.js
			delete tabData.loading;
			await sAPI.loading;
			if (
				isWhitelisted(msg.host) ||
				processed.has(msg.host) &&
				msg.protocol === 'https:' &&
				!isIgnored(msg.host)
			) return pageAction.show(tabId);
			else return pageAction.hide(tabId);
		case 'isWhitelisted':				// popup.js
			return isWhitelisted(msg.host);
		case 'add to whitelist':			// popup.js
			wlSaver.run();
			msg.incognito
			? sAPI.incognitoWhitelist[msg.host] = null
			: sAPI.whitelist[msg.host] = null;
			return;
		case 'remove from whitelist':		// popup.js
			wlSaver.run();
			delete sAPI.whitelist[msg.host];
			delete sAPI.incognitoWhitelist[msg.host];
			return;
		case 'get tabsData URL':			// error.js, redirect.js
			return {url: tabData.url};
		case 'ignore':						// error.js, redirect.js
			return ignore(msg.host, tabId);
		case 'get error code':				// error.js
			return {error: tabData.error};
		case 'get settings':				// options.js
			return sAPI.getAll();
		case 'update sAPI':					// options.js
			for (const i in msg.data) sAPI[i] = msg.data[i]
			return;
	}
});
