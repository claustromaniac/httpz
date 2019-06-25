(() => {
	'use strict';
	window.addEventListener('load', e => {
		browser.runtime.sendMessage({
			tabLoaded: true
		});
	});
})();
