'use strict';

tabs.onCreated.addListener(tab => {
	tabsData[tab.id] = {};
});
tabs.onRemoved.addListener((tabId, removeInfo) => {delete tabsData[tabId]});
tabs.query({}).then(r => {
	for (const tab of r) tabsData[tab.id] = {};
});
