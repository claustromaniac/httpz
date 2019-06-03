'use strict';

const tabs = browser.tabs;

tabs.query({}).then(r => {
	for (const tab of r) tabsData[tab.id] = {
		url: tab.url
	};
});
tabs.onCreated.addListener(tab => {
	tabsData[tab.id] = {};
	if (tab.url) tabsData[tab.id].url = new URL(tab.url);
});
tabs.onRemoved.addListener((tabId, removeInfo) => {delete tabsData[tabId]});
tabs.onUpdated.addListener((id, info, tab) => {
	if (info.url) {
		if (!tabsData[id]) tabsData[id] = {};
		tabsData[id].prevUrl = tabsData[id].url;
		tabsData[id].url = new URL(info.url);
	}
});
