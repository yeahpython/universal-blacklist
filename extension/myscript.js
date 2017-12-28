// var semanticModules = "ytd-grid-video-renderer, cite, time, div, blockquote, sub, em, sup, p, li, td, strong, i, b, span, h1, h2, h3, h4, h5, h6, a, button";

window.hasAqi = true;

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
  var key = getCanonicalHostname(key);
  var current_host = window.location.host;
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
            .replace(/\*/g, "[^\s]*")
            .replace(/\?/g, "[^\s]");
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

// Blurs out anything that contains a text node containing a blacklisted word.
// Tries not to remove and add the .a-quieter-internet-gray class unnecessarily, instead adding
// a dummy class
function enforceCensorship() {
  var enabled_everywhere;
  chrome.storage.local.get({"enabled" : true}, function(items) {
    enabled_everywhere = items["enabled"];

    if (disabled || enabled_everywhere == false || disable_on_this_site) {
      // $(".a-quieter-internet-gray").removeClass("a-quieter-internet-gray");
      $(".aqi-hide").removeClass("aqi-hide");
      $(".aqi-hide-completely").removeClass("aqi-hide-completely");
      $(".aqi-notification").remove();
      return;
    } else {
      var $ancestors = $("*").not("html, head, body, script, style, meta, iframe, title, link, input, ul, hr, svg, g, path, img, polygon")
        // .not(":not(.aqi-hide-completely):hidden")
        .add($(".aqi-hide, .aqi-hide-completely"))
        .filter(function(){
          var text = $(this).contents()
            .filter(function() {
              return this.nodeType === 3; //Node.TEXT_NODE
            }).text();
          var is_match = re.test(text);
          return is_match;
        })
        .map(function(index, elem){
          var ancestor = getFeedlikeAncestor(elem);
          return ancestor.get();
        });

      // This sends a messages to the background script, which can see which tab ID this is.
      // The background script then makes an update to storage that triggers a change in the icon.
      // console.log(window.frameElement.getAttribute("Name"));
      if (my_id !== "ignore") {
        // For now, only count number of blocked things in outermost div.
        if (!inIframe()) {
          chrome.runtime.sendMessage({"count": $ancestors.length});
        }
      }

      

      $(".aqi-hide").not($ancestors).removeClass("aqi-hide");
      $ancestors.not(".aqi-hide").addClass("aqi-hide");
      // console.log($removable);
      // console.log($nonremovable);

      // my hope is that these gymnastics stop the browser from constantly re-rendering
      // the shadows in the cache.

      if (hide_completely_on_this_site) {
        $(".aqi-notification").remove();

        // Syncing seems kind of lame
        $(".aqi-hide-completely").not(".aqi-hide").removeClass("aqi-hide-completely");
        $(".aqi-hide").not(".aqi-hide-completely").addClass("aqi-hide-completely");
        return;
      } else {
        $(".aqi-hide-completely").removeClass("aqi-hide-completely");
      }

      // If a hidden element is not preceded by something with class aqi-notification, add it.
      $ancestors.each(function(index, elem) {
                  var $elem = $(elem);
                  if ($elem.prev(".aqi-notification").length !== 0) {
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
                })
                
      
      // no next? remove self
      $(".aqi-notification").filter(function(index, elem) { return $(elem).next(".aqi-hide").length === 0}).remove();

      // var $removable = $ancestors.filter(function(){return !isStructurallyImportant(this);});
      // var $nonremovable = $ancestors.not($removable);

      // $(".aqi-hide").not($removable).removeClass("aqi-hide");
      // $removable.not(".aqi-hide").addClass("aqi-hide");

      // $(".aqi-obscure").not($nonremovable).removeClass("aqi-obscure");
      // $nonremovable.not(".aqi-obscure").addClass("aqi-obscure");
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
    try {
      enforceCensorship();
    } catch (err){
      if (err.message.startsWith("Invocation of form get(, function)")) {
        return;
      }
      else {
        throw "Failed to enforce filter: " + err;
      }
    }
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
  for (key in changes) {
    if (key == "blacklist") {
      regexNeedsUpdate = true;
      continue;
    } else if (key == "hide_completely") {
      var hideCompletelyNewValue = changes[key].newValue;
      var hide_completely = hideCompletelyNewValue[getCanonicalHostname(window.location.host)];
      hide_completely_on_this_site = (hide_completely === true);
    } else if (key == "disable_site") {
      var disableSiteNewValue = changes[key].newValue;
      var disable_site = disableSiteNewValue[getCanonicalHostname(window.location.host)];
      disable_on_this_site = (disable_site === true);
    }
  }
});