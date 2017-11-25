var input = document.getElementById("input");

// options.js, myscript.js and browser_action.js all need to have the same version
function getCanonicalHostname(name) {
  if (name.startsWith("www.")) {
    return name.substring(4);
  } else {
    return name;
  }
}

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
      // $("#status").html("Saved word: \"" + word + "\"");
      input.value = "";
    });
  });
}
// // Add the word to the blacklist when the user click the add button
// $("#add").click(addWord);

$("#toggle").click(function(){
  chrome.storage.local.get({"enabled": true}, function(items){
    chrome.storage.local.set({"enabled": !items["enabled"]}, rerender)
  })

})

// Add the word to the blacklist when the user presses enter
$("#input").keyup(function(e){
	if (e.keyCode == 13) {
		addWord();
	}
})

$("#options").click(function(){
  if (chrome.runtime.openOptionsPage) {
    // New way to open options pages, if supported (Chrome 42+).
    chrome.runtime.openOptionsPage();
  } else {
    // Reasonable fallback.
    window.open(chrome.runtime.getURL('options.html'));
  }
});

$("#feedback").click(function(){
  window.open("https://goo.gl/forms/YTaZXZA0IFys1v6y2");
});

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
  chrome.storage.local.get({"blacklist":{}, "enabled":true, "hide_completely":{}, "disable_site":{}}, function(items){
    if (items["enabled"] === false) {
      $("#toggle").html("&#9658;").addClass("resume").show();
      $("#list").hide();
      $("#disable_site").hide();
      $("#hide_completely").hide();
      $("#status").text("Filter Anything Everywhere is paused.").show();
      return;
    }

    chrome.tabs.query({active:true,currentWindow:true},function(tabArray){
      var parser = document.createElement('a');
      parser.href = tabArray[0].url;
      chrome.tabs.executeScript(tabArray[0].id, {code : "window.hasAqi"}, function(result) {
        
        if (chrome.runtime.lastError) {
          var errorMsg = chrome.runtime.lastError.message
          if (errorMsg == "Cannot access a chrome:// URL" || result == undefined) {
            $("#disable_site input[type=checkbox]")
              .hide()
            $("#disable_site_label").hide();
            // TODO: Stop using this as a status bar
            $("#disable_site").show();
            $("#hide_completely").hide();
            $("#list").hide();
            $("#toggle").hide();
            $("#status").text("Extensions aren't allowed on this page.").show();
            return;
          }
        }
        if (!result[0]) {
          $("#disable_site input[type=checkbox]")
            .hide()
          $("#disable_site_label").hide();
          $("#disable_site").show();
          $("#hide_completely").hide();
          $("#list").hide();
          $("#toggle").hide();
          $("#status").text("Looks like a new installation. To start filtering, refresh the page.").show();
          return;
        }

        $("#toggle").html("&#10074;&#10074;").removeClass("resume").show();
        canonical_hostname = getCanonicalHostname(parser.hostname);
        var hostname_disabled = (items["disable_site"][canonical_hostname] === true)
        $("#disable_site")
          .find("#disable_site_label")
            .html("Filter " + canonical_hostname)
            .show()
          .end()
          .find("input[type=checkbox]")
            .prop("checked", !hostname_disabled)
            .click(function(){
              chrome.storage.local.get({"disable_site":{}}, function(items){
                var disable_site = items["disable_site"];
                if (hostname_disabled) {
                  delete disable_site[canonical_hostname];
                } else {
                  disable_site[canonical_hostname] = true;
                }
                chrome.storage.local.set({"disable_site":disable_site});
              })
            })
            .show()
          .end()
          .show();
        if (hostname_disabled) {
          $("#list").hide();
          // $("#status").text("Filtering is disabled on " + canonical_hostname + ".").show();
          $("#status").hide();
          $("#hide_completely").hide();
          return;
        }
        if (!hostname_disabled) {
          var hostname_hide_completely = (items["hide_completely"][canonical_hostname] === true)
          if(hostname_hide_completely) {
            // $("#status").text("Not showing hidden content indicators on " + canonical_hostname + ".").show();
            $("#status").hide();
          } else {
            $("#status").hide();
          }
          $("#hide_completely")
            .find("#hide_completely_label")
              .html("Indicate filtered content on this site")
              .show()
            .end()
            .find("input[type=checkbox]")
              .prop("checked", !hostname_hide_completely)
              .click(function(){
                chrome.storage.local.get({"hide_completely":{}}, function(items){
                  var hide_completely = items["hide_completely"];
                  if (hostname_hide_completely) {
                    delete hide_completely[canonical_hostname];
                  } else {
                    hide_completely[canonical_hostname] = true;
                  }
                  chrome.storage.local.set({"hide_completely":hide_completely});
                })
              })
              .show()
            .end()
            .show();

          // console.log(tabArray[0].host);
          $("#list").show();
          // only render list if it is enabled
          if (items["blacklist"] && items["blacklist"].length !== 0) {
            $.each(items["blacklist"], function(currentValue, trueOrFalse){
              $("<li/>").html(currentValue).appendTo(list);
            });
            $("#triggers").html(list);
          } else {
            $("#triggers").html("blacklist is empty");
          }
        }
      });

      
    });

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