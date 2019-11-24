'use strict';

tabs.onCreated.addListener(tab => {
	tabsData[tab.id] = {};
});
tabs.onRemoved.addListener((tabId, removeInfo) => {delete tabsData[tabId]});
tabs.onUpdated.addListener((id, info, tab) => {
	if (info.status !== 'complete') return;
	const url = new URL(tab.url);
	if (
		( processed.has(url.hostname) && url.protocol === 'https:' ) ||
		( isWhitelisted(url.hostname) && url.protocol === 'http:' )
	) pageAction.show(id);
}, {properties: ['status']});
tabs.query({}).then(r => {
	for (const tab of r) tabsData[tab.id] = {};
});
