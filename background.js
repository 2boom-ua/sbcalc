// Sidebar Calculator - Chrome/Edge Extension
// Copyright 2boom, 2026

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true
    });
});