// var semanticModules = "ytd-grid-video-renderer, cite, time, div, blockquote, sub, em, sup, p, li, td, strong, i, b, span, h1, h2, h3, h4, h5, h6, a, button";

window.hasAqi = true;

var AQI_PREFIX = "aqi-"

// options.js, myscript.js and browser_action.js all need to have the same version
function getCanonicalHostname(name) {
  if (name.startsWith("www.")) {
    return name.substring(4);
  } else {
    return name;
  }
}

// Utility function for getting settings for the current host.
function fetchStatusForHost(key, cb) {
  var current_host = getCanonicalHostname(window.location.host);
  chrome.storage.local.get(key, function(items) {
    if (items[key] === undefined) {
      cb(false);
      return;
    }
    cb(items[key][current_host] === true);
  });
}

var hide_completely_on_this_site = false;
var disable_on_this_site = false;

// Eventually sets it to the right thing. Doesn't really matter what the order is, unless
// it gets changed to true and then we read from storage that it used to be false
fetchStatusForHost("hide_completely", function(val) {
  hide_completely_on_this_site = val;
});
fetchStatusForHost("disable_site", function(val) {
  disable_on_this_site = val;
});

var min_feed_neighbors = 3;

// Escape bad characters from user input.
function escapeRegExpOld(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// Escape bad characters from user input, but allow wildcards.
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|]/g, "\\$&")
            .replace(/\*/g, "[^\\s]*")
            .replace(/\?/g, "[^\\s]");
}

// Some characters are represented by more than a byte. To match them
// in a regular expression, we need to modify the way they are stored.
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
    // I used to check whether or not siblings were hidden, but this caused problems
    // when there were large hidden arrays of objects, e.g. in Youtube, which would
    // cause the whole page to be hidden. This new setting hopefully is less prone
    // to hiding entire lists.

    var matching_siblings = $(elem).siblings()/*.not(":hidden")*/.filter(function(index, sib){
      // Function returns true iff sibling has a class in common with the original.
      var $sib = $(sib)

      if (elem.tagName != sib.tagName) {
        return false;
      }

      // hacking to just compare number of children
      // return $sib.children().length == num_children;
      for (var i = 0; i < my_class_split.length; i++){
        // TODO: remove earlier
        if ((my_class_split[i] !== "") && (!(my_class_split[i].startsWith(AQI_PREFIX))) && $sib.hasClass(my_class_split[i])) {
          return true;
        }
      }
      return false;
    });
    return Math.min(matching_siblings.length, min_feed_neighbors);
  }); //n_siblings

  var best_count = -1;
  var best_index = -1;

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

var replyRegexp = new RegExp("reply", "i");
var commentRegexp = new RegExp("comment|retweet", "i");
function looksLikeComment(elem) {
  var stringContents = $(elem).contents().text();
  // console.log(stringContents);
  var contains_replyable = replyRegexp.test(stringContents);
  var contains_commentable = commentRegexp.test(stringContents);
  // console.log(contains_replyable + " " + contains_commentable);
  // You don't need to worry about 
  return contains_replyable && !contains_commentable;
}

// Paragraphs, comments and linkless divs all seem like they probably
// have a relationship with their siblings in the DOM tree.
function isStructurallyImportant(elem) {
  return looksLikeComment(elem) || $(elem).is("p") || !($(elem).find("a").length);
}

/*$("div").click(function(e){
  getFeedlikeAncestor(e.target).css("background-color", "red");
})*/

var disabled = false;

function setHideCompletelyOnCurrentSite() {
  var current_url = window.location.href;
  var current_host = window.location.host;

  chrome.storage.local.get("hide_completely", function(items) {
    var hide_completely = items["hide_completely"];
    // Add word to our copy of the blacklist
    if (hide_completely === undefined) {
      hide_completely = {};
    }
    hide_completely[current_host] = true;
    // Set the blacklist with our modified copy
    chrome.storage.local.set({"hide_completely": hide_completely});
  });
}

function setDisableOnCurrentSite() {
  var current_url = window.location.href;
  var current_host = window.location.host;

  chrome.storage.local.get({"disable_site": {}}, function(items) {
    var disable_site = items["disable_site"];
    // Add word to our copy of the blacklist
    disable_site[current_host] = true;
    // Set the blacklist with our modified copy
    chrome.storage.local.set({"disable_site": disable_site});
  });
}

function findMyId() {
  var iframes = parent.document.getElementsByTagName("iframe");
  
  for (var i=0, len=iframes.length; i < len; ++i) {
    if (document == iframes[i].contentDocument ||
        self == iframes[i].contentWindow) {
        return iframes[i].id;
    }
  }
  return "";
}
try {
  var my_id = findMyId();
}
catch(err) {
  var my_id = "ignore";
}

function inIframe () {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function addNotification(unused_index, elem) {
  var $elem = $(elem);
  if ($elem.prev(".aqi-notification").length !== 0) {
    return;
  }
  if ($.isWindow($elem)) {
    console.log("This is a window");
    return;
  }
  var $positioner = $("<div/>").addClass("aqi-notification");
  var $contents = $("<div/>").addClass("aqi-inside")
    .css("max-width", $elem.width());
  var $arrow = $("<div/>").addClass("aqi-arrow");
  var $arrow_wrapper = $("<div/>").addClass("aqi-arrow-wrapper").click(function() {
      $positioner.next(".aqi-hide").addClass("aqi-hide-exception");
      $positioner.addClass("aqi-disabled");
    }).append($arrow);
  var $options = $("<div/>").addClass("aqi-options");
  //.text("Show | Hide warnings on this site | Disable on this site");

  // var $show = $("<a/>")
  //   .text("View")
  //   .click(function() {
  //     $positioner.next(".aqi-hide").addClass("aqi-hide-exception");
  //     $positioner.addClass("aqi-disabled");
  //   });

  var $hide_warnings = $("<a/>")
    .text("Hide warning on this site")
    .click(function(){
      setHideCompletelyOnCurrentSite();
    });
  var $disable_aqi = $("<a/>")
    .text("Disable on this site")
    .click(function() {
      setDisableOnCurrentSite();
    });

  // $options.append($show);
  // $options.append(" | ");
  $options.append($hide_warnings);
  $options.append(" | ");
  $options.append($disable_aqi);
  
  $contents.append($arrow_wrapper);
  $contents.append($options);
  $positioner.append($contents);
  $elem.before($positioner);
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

function processTextNode(node, hide_completely, regex) {
  if (regex.test(node.data)) {
    var ancestor = getFeedlikeAncestor(node);
    try {
      if (hide_completely) {
        ancestor.addClass("aqi-hide-completely");
      } else {
        addNotification(null, ancestor);
        ancestor.addClass("aqi-hide");
      }
    } catch (e) {
      console.log("hit error adding notification.");
    }
  }
}

var observer = null;

function startObservingChanges(processCallback) {
  const targetNode = document.documentElement;
  const config = {attributes: false, childList: false, characterData: true, subtree: true};
  const callback = function(mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'characterData') {
        processCallback(mutation.target);
      }
    }
  }
  observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
}

function clearAll() {
  if (observer) {
    observer.disconnect();
  }
  $(".aqi-hide").removeClass("aqi-hide");
  $(".aqi-hide-completely").removeClass("aqi-hide-completely");
  $(".aqi-notification").remove();
  $(".aqi-debug").removeClass("aqi-debug");
}

function render(enabled_everywhere, hide_completely, disable_site, regex) {
  clearAll();

  if (!enabled_everywhere || disable_site) {
    return;
  }

  let process = (node) => {processTextNode(node, hide_completely, regex)}

  walk=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT,null,false);
  while (walk.nextNode()) {
    process(walk.currentNode);
  }
  startObservingChanges(process);
}

// Fetch all parameters and then redraw
function restart() {
  let enabled_everywhere, hide_completely, disable_site;
  // todo: Do it in one operation.
  new Promise((resolve, reject) => {
    chrome.storage.local.get({"enabled" : true}, (items) => resolve(items["enabled"]));
  })
  .then( (enabled_everywhere_in) => {
    enabled_everywhere = enabled_everywhere_in;
    return new Promise((resolve, reject) => {
      fetchStatusForHost("hide_completely", resolve);
    });
  })
  .then(hide_completely_in => {
    hide_completely = hide_completely_in;
    return new Promise((resolve, reject) => {
      fetchStatusForHost("disable_site", resolve);
    });
  })
  .then((disable_site_in) => {
    disable_site = disable_site_in;
    return new Promise((resolve, reject) => {
      makeRegex(resolve);
    });
  })
  .then(() => {
    render(enabled_everywhere, hide_completely, disable_site, re);

    // This sends a messages to the background script, which can see which tab ID this is.
    // The background script then makes an update to storage that triggers a change in the icon.
    // console.log(window.frameElement.getAttribute("Name"));
    if (my_id !== "ignore") {
      // For now, only count number of blocked things in outermost div.
      if (!inIframe()) {
        chrome.runtime.sendMessage({"count": $(".aqi-hide").length});
      }
    }
  })
  .catch((err)=> console.log(err));
}

// When the blacklist changes the regex needs to be updated
chrome.storage.onChanged.addListener(function(changes, namespace) {
  restart();
});

restart();