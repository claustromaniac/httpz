'use strict';

const tabs = browser.tabs;

tabs.onCreated.addListener(tab => {
	tabsData[tab.id] = {};
});
tabs.onRemoved.addListener((tabId, removeInfo) => {delete tabsData[tabId]});
tabs.query({}).then(r => {
	for (const tab of r) tabsData[tab.id] = {
		url: tab.url
	};
});
