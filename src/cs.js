(() => {
	'use strict';
	window.onload = e => {
		browser.runtime.sendMessage({
			tabLoaded: true
		});
	};
})();
