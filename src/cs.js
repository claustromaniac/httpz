(() => {
	'use strict';
	browser.runtime.sendMessage({tabLoaded: true});
})();
