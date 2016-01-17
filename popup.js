var input = document.getElementById("input");

// Add the word from $("#input") to the stored blacklist
function addWord() {
  var word = input.value;
  if (word === "") {
    $("#response").html("Please enter a word");
    return;
  }
  // Get the stored blacklist
  chrome.storage.sync.get("blacklist", function(items) {
  	var blacklist = items["blacklist"];
  	// Add word to our copy of the blacklist
    if (blacklist) {
  		blacklist[word] = true;
  	} else {
  		blacklist = {word: true};
  	}
    // Set the blacklist with our modified copy
  	chrome.storage.sync.set({"blacklist": blacklist}, function(){
      rerender();
      $("#response").html("Saved word " + word);
      input.value = "";
    });
  });
}
// Add the word to the blacklist when the user click the add button
$("#add").click(addWord);

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
		chrome.storage.sync.get("blacklist", function(items){
			var blacklist = items["blacklist"];
			if (blacklist) {
				delete blacklist[word];
				chrome.storage.sync.set({"blacklist":blacklist}, function(){
					rerender();
					$("#response").html("Removed word " + word);
				});
			}
		});
	}
});

// Shows a list of words generated from the blacklist.
function rerender() {
  var list = $("<ul/>");
  chrome.storage.sync.get("blacklist", function(items){
  	if (items["blacklist"] && items["blacklist"].length !== 0) {
  	  $.each(items["blacklist"], function(currentValue, trueOrFalse){
   		  $("<li/>").html(currentValue).appendTo(list);
  	  });
  	  $("#triggers").html(list);
    } else {
    	$("#triggers").html("no trigger words set");
    }
  });
}

// Initial render
rerender();