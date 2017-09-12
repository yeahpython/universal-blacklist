chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	if (msg.action == "toggleActiveTab") {
		toggleActiveTab();
	} else {
    	chrome.storage.local.set({"badge_info":{"id":sender.tab.id, "count":msg.count}})
	}
});


function toggleActiveTab() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	    chrome.tabs.sendMessage(tabs[0].id, {action: "toggle_disable"});
	});
}