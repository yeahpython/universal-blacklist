// var semanticModules = "ytd-grid-video-renderer, cite, time, div, blockquote, sub, em, sup, p, li, td, strong, i, b, span, h1, h2, h3, h4, h5, h6, a, button";

var min_feed_neighbors = 3;

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
  // console.log(node);
  // parents ordered by document order
  var parents = $(node).add($(node).parents());
  var siblingness_counts = parents.map(function(index,elem){
    var myclass = $(elem).attr("class");
    var num_children = $(elem).children().length;
    if (myclass === undefined){
      my_class_split = [];
    } else {
      my_class_split = myclass.split(' ')
    }

    if ($(elem).prop("tagName") == "LI") {
      return min_feed_neighbors + 1; // Generic "big" number
    }

    // three siblings is good enough to be a list.
    return Math.min($(elem).siblings().not(":hidden").filter(function(index, sib){
      // Function returns true iff sibling has a class in common with the original.
      var $sib = $(sib)

      // hacking to just compare number of children
      // return $sib.children().length == num_children;
      for (var i = 0; i < my_class_split.length; i++){
        // TODO: remove earlier
        if ((my_class_split[i] !== "") && (my_class_split !== "a-quieter-internet-gray") && $sib.hasClass(my_class_split[i])) {
          return true;
        }
      }
      return false;
    }).length, min_feed_neighbors);
  }); //n_siblings

  var best_count = -1;
  var best_index = -1;
  // console.log(siblingness_counts);

  // Note, parents were ordered by document order
  for (var i = siblingness_counts.length - 1; i >= 0; i--) {
    if (siblingness_counts[i] > best_count) {
      best_count = siblingness_counts[i];
      best_index = i;
    }
    // console.log(best_index);
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
// Tries not to remove and add the .a-quieter-internet-gray class unnecessarily, instead adding
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
      $(".a-quieter-internet-gray").removeClass("a-quieter-internet-gray");
      return;
    } else {
      var zeros = $("*").not("html, head, body, script, style, meta, title, link, input, ul, hr, iframe, svg, g, path, img, polygon").not(":hidden")
        .filter(function(){
          return re.test($(this).contents()
            .filter(function() {
              return this.nodeType === 3; //Node.TEXT_NODE
            }).text());
        })
        // .addClass("my-temp")
        // .filter(":not(.my-temp .my-temp)")
        .map(function(index, elem){
          var ancestor = getFeedlikeAncestor(elem);
          ancestor.addClass("new-a-quieter-internet-gray");
          // console.log(ancestor);
          return 0;
        })
      var count = zeros.length;
      // This sends a messages to the background script, which can see which tab ID this is.
      // The background script then makes an update to storage that triggers a change in the icon.
      chrome.runtime.sendMessage({"count": count });

      // $(".my-temp").removeClass("my-temp");
      // The class .my-temp is used to ensure that whenever a DOM element and its
      // child is marked for blurring, we only blur the higher-level one.

      // my hope is that these gymnastics stop the browser from constantly re-rendering
      // the shadows in the cache.
      $(".a-quieter-internet-gray:not(.new-a-quieter-internet-gray)").removeClass("a-quieter-internet-gray");
      $(".new-a-quieter-internet-gray:not(.a-quieter-internet-gray)").addClass("a-quieter-internet-gray");
      $(".new-a-quieter-internet-gray").removeClass("new-a-quieter-internet-gray");
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
  try {
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
  } catch (err) {
    console.log("Ran into error while making regex:" + err.message);
  }
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