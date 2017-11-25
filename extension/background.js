chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	if (msg.action == "toggleActiveTab") {
		toggleActiveTab();
	} else {
		console.log(msg);
		var count_string = msg.count ? msg.count.toString() : "";
		chrome.browserAction.setBadgeBackgroundColor({ color: [100, 100, 100, 255] });
		chrome.browserAction.setBadgeText({text: count_string, "tabId": sender.tab.id});
	}
});


function toggleActiveTab() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	    chrome.tabs.sendMessage(tabs[0].id, {action: "toggle_disable"});
	});
}