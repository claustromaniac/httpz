browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	// triggered by options page script
	return settings.all;
});
