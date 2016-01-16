var input = document.getElementById("input");

function addWord() {
  var word = input.value;
  chrome.storage.sync.get("triggers", function(items) {
  	var savedTriggers = items["triggers"];
  	console.log(savedTriggers);
  	if (savedTriggers) {
  		savedTriggers[word] = true;
  	} else {
  		savedTriggers = {word: true};
  	}
  	chrome.storage.sync.set({"triggers": savedTriggers}, function(){
      rerender();
      $("#response").html("Saved word " + word);
      input.value = "";
    });
  });
}

$("#add").click(addWord);
$("#input").keyup(function(e){
	if (e.keyCode == 13) {
		addWord();
	}
})
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

function rerender() {
  //$("#triggers").html("");
  var list = $("<ul/>");
  chrome.storage.sync.get("triggers", function(items){
  	console.log(items);
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
rerender();