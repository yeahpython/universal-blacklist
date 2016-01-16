var input = document.getElementById("input");

// Add the word from $("#input") to the stored blacklist
function addWord() {
  var word = input.value;
  // Get the stored blacklist
  chrome.storage.sync.get("triggers", function(items) {
  	var savedTriggers = items["triggers"];
  	// Add word to our copy of the blacklist
    if (savedTriggers) {
  		savedTriggers[word] = true;
  	} else {
  		savedTriggers = {word: true};
  	}
    // Set the blacklist with our modified copy
  	chrome.storage.sync.set({"triggers": savedTriggers}, function(){
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
		chrome.storage.sync.get("triggers", function(items){
			var savedTriggers = items["triggers"];
			if (savedTriggers) {
				delete savedTriggers[word];
				chrome.storage.sync.set({"triggers":savedTriggers}, function(){
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
  chrome.storage.sync.get("triggers", function(items){
  	if (items["triggers"] && items["triggers"].length !== 0) {
  	  $.each(items["triggers"], function(currentValue, trueOrFalse){
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