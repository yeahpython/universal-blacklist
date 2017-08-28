var input = document.getElementById("input");

// Add the word from $("#input") to the stored blacklist
function addWord() {
  var word = input.value;
  if (word === "") {
    return;
  }
  // Get the stored blacklist
  chrome.storage.local.get("blacklist", function(items) {
  	var blacklist = items["blacklist"];
  	// Add word to our copy of the blacklist
    if (blacklist === undefined) {
      blacklist = {};
    }
  	blacklist[word] = true;
    // Set the blacklist with our modified copy
  	chrome.storage.local.set({"blacklist": blacklist}, function(){
      rerender();
      /*$("#response").html("Saved word: \"" + word + "\"");*/
      input.value = "";
    });
  });
}
// // Add the word to the blacklist when the user click the add button
// $("#add").click(addWord);

$("#toggle").click(function(){
  chrome.storage.local.get("enabled", function(items){
    var enabled = items["enabled"]
    if (enabled === undefined) {
      enabled = true
    }
    chrome.storage.local.set({"enabled": !enabled}, rerender)
  })

})

// Add the word to the blacklist when the user presses enter
$("#input").keyup(function(e){
	if (e.keyCode == 13) {
		addWord();
	}
})

// Remove any word in the blacklist that is clicked from the storage
$("#triggers").click(function(e){
	if ($(event.target).is("li")) {
		var word = event.target.innerHTML;
		chrome.storage.local.get("blacklist", function(items){
			var blacklist = items["blacklist"];
			if (blacklist) {
				delete blacklist[word];
				chrome.storage.local.set({"blacklist":blacklist}, function(){
					rerender();
					/*$("#response").html("Removed word: \"" + word + "\"");*/
				});
			}
		});
	}
});

// Shows a list of words generated from the blacklist.
function rerender() {
  var list = $("<ul/>");
  chrome.storage.local.get(["blacklist", "enabled"], function(items){
    if (items["enabled"] === false) {
      $("#toggle").html("Enable blacklist");
      $("#list").hide()
    } else {
      $("#list").show()
      // only render list if it is enabled
    	if (items["blacklist"] && items["blacklist"].length !== 0) {
    	  $.each(items["blacklist"], function(currentValue, trueOrFalse){
     		  $("<li/>").html(currentValue).appendTo(list);
    	  });
    	  $("#triggers").html(list);
      } else {
      	$("#triggers").html("blacklist is empty");
      }
      $("#toggle").html("Disable blacklist");
    }

    // if (items["enabled"] === undefined || items["enabled"] === true) {
    //   $("#toggle").html("Disable blacklist");
    // }
    // else {
    //   $("#toggle").html("Enable blacklist");
    // }

  });
}

// Initial render
rerender();

chrome.storage.onChanged.addListener(function(changes, namespace){
  rerender();
});