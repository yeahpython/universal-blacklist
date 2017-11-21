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
      // $(".a-quieter-internet-gray").removeClass("a-quieter-internet-gray");
      $(".aqi-hide").removeClass("aqi-hide");
      $(".aqi-notification").remove();
      return;
    } else {
      var $ancestors = $("*").not("html, head, body, script, style, meta, iframe, title, link, input, ul, hr, svg, g, path, img, polygon")
        .not(":hidden")
        .add(".aqi-hide")
        .filter(function(){
          return re.test($(this).contents()
            .filter(function() {
              return this.nodeType === 3; //Node.TEXT_NODE
            }).text());
        })
        .map(function(index, elem){
          var ancestor = getFeedlikeAncestor(elem);
          return ancestor.get();
        });

      // This sends a messages to the background script, which can see which tab ID this is.
      // The background script then makes an update to storage that triggers a change in the icon.
      chrome.runtime.sendMessage({"count": $ancestors.length});


      

      $(".aqi-hide").not($ancestors).removeClass("aqi-hide");
      $ancestors.not(".aqi-hide").addClass("aqi-hide");
      // console.log($removable);
      // console.log($nonremovable);

      // my hope is that these gymnastics stop the browser from constantly re-rendering
      // the shadows in the cache.

      // no prev ? add it
      $ancestors.filter(function(index, elem) { return $(elem).prev(".aqi-notification").length === 0}).before("<div class='aqi-notification'><div class='aqi-inside'>[filtered]</div></div>");
      
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