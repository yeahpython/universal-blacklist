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
    console.log(result);
    return result;
}

// This will be a regex that matches blacklisted strings
var re;

// Set to true when the user updates the blacklist
var regexNeedsUpdate = true;


// Blurs out anything that contains a text node containing a blacklisted word.
// Tries not to remove and add the .censorship-blur class unnecessarily, instead adding
// a dummy class
function enforceCensorship() {
  var $newblur = $(semanticModules)
    .filter(function(){
      return re.test($(this).contents()
        .filter(function() {
          return this.nodeType === 3; //Node.TEXT_NODE
        }).text());
    })
    .addClass("my-temp")
    .filter(":not(.my-temp .my-temp)")
    .parent()
    .addClass("new-censorship-blur");
    /*.addClass("my-temp");
    $("* > .my-temp").addClass("new-censorship-blur");*/
  $(".my-temp").removeClass("my-temp");
  // The class .my-temp is used to ensure that whenever a DOM element and its
  // child is marked for blurring, we only blur the higher-level one.

  // my hope is that these gymnastics stop the browser from constantly re-rendering
  // the shadows in the cache.
  $(".censorship-blur:not(.new-censorship-blur)").removeClass("censorship-blur");
  $(".new-censorship-blur:not(.censorship-blur)").addClass("censorship-blur");
  $(".new-censorship-blur").removeClass("new-censorship-blur");
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
  chrome.storage.local.get(["blacklist", "enabled"], function(items) {
    var bannedWords = items["blacklist"];
    if (items["enabled"] == false) {
      // Rejects everything
      regexString = "";
    } else {
	    var escapedBannedWords = $.map(bannedWords, function(val, key) {
	      return /*"\\b" + */escapeRegExp(key)/* + "\\b"*/;
	    });
	    var regexString = escapedBannedWords.map(function(elem, index){
	      return makeRegexCharactersOkay(elem);
	    }).join("|");
	    console.log(regexString);
	}

    if (regexString == "") {
      // Rejects everything
      regexString = "[^\\w\\W]";
    }
    re = new RegExp(regexString, "i");
    regexNeedsUpdate = false;
    callback();
  });
}

// Initiates censorship loop.
censorshipLoop();

// When the blacklist changes the regex needs to be updated
chrome.storage.onChanged.addListener(function(changes, namespace){
  regexNeedsUpdate = true;
});