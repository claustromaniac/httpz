(() => {
	'use strict';
	browser.runtime.sendMessage({
		action: 'content script',
		host: location.host,
		protocol: location.protocol
	});
})();
