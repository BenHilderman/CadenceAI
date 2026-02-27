// Open side panel when the orb is clicked (message from content script)
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "OPEN_SIDE_PANEL" && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id });
  }
});

// Set side panel behavior — open on action click too
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
