const wlSaver = new DelayableAction(10, 60, () => {
	browser.storage.local.set({
		whitelist: settings.whitelist,
		incognitoWhitelist: settings.incognitoWhitelist
	});
});
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg === 'options') return settings.all; // triggered by options page script
	// triggered by popup script
	if (msg.value) {
		wlSaver.run();
		return (async () => {
			if (msg.value === 2) return settings.incognitoWhitelist[msg.host] = true;
			return settings.whitelist[msg.host] = true;
		})();
	} else if (msg.host) {
		wlSaver.run();
		return (async () => {
			return delete settings.whitelist[msg.host] &&
			delete settings.incognitoWhitelist[msg.host];
		})();
	}
});
