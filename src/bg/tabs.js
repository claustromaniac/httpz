'use strict';

tabs.onCreated.addListener(tab => {
	tabsData[tab.id] = {incognito: tab.incognito};
});
tabs.onRemoved.addListener((tabId, removeInfo) => {delete tabsData[tabId]});
