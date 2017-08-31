var semanticModules = "cite, time, div, blockquote, sub, em, sup, p, li, td, strong, i, b, span, h1, h2, h3, h4, h5, h6, a, button";

// Escape bad characters from user input.
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function makeRegexCharactersOkay(string){
    var hex, i;

    var result = "";
    for (i=0; i<string.length; i++) {
        hex = string.charCodeAt(i);
        if (hex < 256) {
          result += string.charAt(i);
        } else {
          hex = hex.toString(16);
          result += "\\u" + (("000"+hex).slice(-4));
        }
    }
    return result;
}

// This will be a regex that matches blacklisted strings
var re;

// Set to true when the user updates the blacklist
var regexNeedsUpdate = true;




function getFeedlikeAncestor(node){
  var parents = $(node).parents()
  var siblingness_counts = parents.map(function(index,elem){
    var myclass = $(elem).attr("class")
    if (myclass === undefined){
      my_class_split = [];
    } else {
      my_class_split = myclass.split(' ')
    }
    // return number of siblings with some class in common
    return $(elem).siblings().filter(function(index, sib){
      // Function returns true iff sibling has a class in common with the original.
      var $sib = $(sib)
      for (var i = 0; i < my_class_split.length; i++){
        // TODO: remove earlier
        if ((my_class_split[i] !== "") && (my_class_split !== "censorship-blur") && $sib.hasClass(my_class_split[i])) {
          return true;
        }
      }
      return false;
    }).length;
  }); //n_siblings

  var best_count = -1;
  var best_index = -1;
  for (var i = 0; i < siblingness_counts.length; i++) {
    if (siblingness_counts[i] > best_count) {
      best_count = siblingness_counts[i];
      best_index = i;
    }
  }
  if (best_index < 0) {
    console.log("Uh oh: best_index < 0");
    chosen_dom_element = node
  } else {
    chosen_dom_element = parents[best_index]
  }
  return $(chosen_dom_element);
}

/*$("div").click(function(e){
  getFeedlikeAncestor(e.target).css("background-color", "red");
})*/

var disabled = false;

// Blurs out anything that contains a text node containing a blacklisted word.
// Tries not to remove and add the .censorship-blur class unnecessarily, instead adding
// a dummy class
function enforceCensorship() {
  var enabled_everywhere;
  chrome.storage.local.get(["enabled"], function(items) {
    if (items["enabled"] == undefined) {
      enabled_everywhere = true;
    } else {
      enabled_everywhere = items["enabled"];
    }

    if (disabled || enabled_everywhere == false) {
      $(".censorship-blur").removeClass("censorship-blur");
      return;
    } else {
      console.log(enabled_everywhere);
      var zeros = $(semanticModules)
        .filter(function(){
          return re.test($(this).contents()
            .filter(function() {
              return this.nodeType === 3; //Node.TEXT_NODE
            }).text());
        })
        .addClass("my-temp")
        .filter(":not(.my-temp .my-temp)")
        .map(function(index, elem){
          getFeedlikeAncestor(elem).addClass("new-censorship-blur")
          return 0;
        })
      var count = zeros.length;
      // This sends a messages to the background script, which can see which tab ID this is.
      // The background script then makes an update to storage that triggers a change in the icon.
      chrome.runtime.sendMessage({"count": count });

      $(".my-temp").removeClass("my-temp");
      // The class .my-temp is used to ensure that whenever a DOM element and its
      // child is marked for blurring, we only blur the higher-level one.

      // my hope is that these gymnastics stop the browser from constantly re-rendering
      // the shadows in the cache.
      $(".censorship-blur:not(.new-censorship-blur)").removeClass("censorship-blur");
      $(".new-censorship-blur:not(.censorship-blur)").addClass("censorship-blur");
      $(".new-censorship-blur").removeClass("new-censorship-blur");
    }
  });
}

// Search page for occurences of words on the blacklist and blurs out certain elements that contain them.
// Sets up hover handlers so that elements are unblurred on mouseover.
// Loops once a second to account for with DOM changes initiated by the website.
function censorshipLoop() {
  if (regexNeedsUpdate) {
    makeRegex(enforceCensorship);
  } else {
    enforceCensorship();
  }
  setTimeout(censorshipLoop, 1000);
}

// Assembles a regex from stored blacklist
function makeRegex(callback) {
  chrome.storage.local.get(["blacklist"/*, "enabled"*/], function(items) {
    var bannedWords = items["blacklist"];
    // if (items["enabled"] == false) {
    //   // Rejects everything
    //   regexString = "";
    // } else {
	    var escapedBannedWords = $.map(bannedWords, function(val, key) {
	      return "\\b" + escapeRegExp(key) + "\\b";
	    });
	    var regexString = escapedBannedWords.map(function(elem, index){
	      return makeRegexCharactersOkay(elem);
	    }).join("|");
	// }

    if (regexString == "") {
      // Rejects everything
      regexString = "[^\\w\\W]";
    }
    re = new RegExp(regexString, "i");
    regexNeedsUpdate = false;
    callback();
  });
}

chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.action == 'toggle_disable') {
    disabled = true;
  }
});

// Initiates censorship loop.
censorshipLoop();

// When the blacklist changes the regex needs to be updated
chrome.storage.onChanged.addListener(function(changes, namespace){
  regexNeedsUpdate = true;
});