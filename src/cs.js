(() => {
	'use strict';
	browser.runtime.sendMessage({
		tabHost: location.host,
		tabLoaded: true
	});
})();
