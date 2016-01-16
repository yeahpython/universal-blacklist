var semanticModules = "p, span, h1, h2, h3, h4, h5, h6, a, button" +
", [class*=item], [class*=Item], [class*=entry], [class*=Entry]" +
", .userContentWrapper"; // Facebook



// Escape bad characters from user input.
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// This tracks how many times the regex has been modified on this page.
var modcount = 0;

// This will be a regex that matches blacklisted strings
var re;

// Set to true when the user updates the blacklist
var regexNeedsUpdate = true;

// Search page for occurences of words on the blacklist and blurs out certain elements that contain them.
// Sets up hover handlers so that elements are unblurred on mouseover.
// Loops once a second to account for with DOM changes initiated by the website.
function enforceCensorship() {
  // This is used to be able to determine when mouseover and mouseouts
  var ruleSetTime = modcount;

  // Mostly toggles between .censorship-hover and .censorship-blur classes
  var mouseOverHandler = function(){
    if (ruleSetTime == modcount) {
      $(this).addClass("censorship-hover");
    } else {
      // Removes self if it notices that it is outdated
      $(this).unbind('mouseover', mouseOverHandler);
    }
    $(this).removeClass("censorship-blur");
  };

  // Mostly toggles between .censorship-hover and .censorship-blur classes
  var mouseOutHandler = function() {
    if (ruleSetTime == modcount) {
      $(this).addClass("censorship-blur");
    } else {
      // Removes self if it notices that it is outdated
      $(this).unbind('mouseout', mouseOutHandler);
    }
    $(this).removeClass("censorship-hover");
  };

  // Find common low-level DOM elements, and add .censorship-blur class to them

  $(semanticModules)
    .filter(":not(.censorship-blur, .censorship-hover)")
	  .filter(function(){
	  	return re.test($(this).text());
	  })
    .addClass("censorship-blur")
    .hover(mouseOverHandler, mouseOutHandler);

  if (regexNeedsUpdate) {
    // When blacklist is modified
    // remove old blurs
    modcount += 1;
    $(semanticModules).filter(".censorship-blur")
      .removeClass("censorship-blur");
    $(semanticModules).filter(".censorship-hover")
      .removeClass("censorship-hover");
    setTimeout(makeRegexAndEnforceCensorship, 1000);
  } else {
    // Loop once a second
    setTimeout(enforceCensorship, 1000);
  }
}

// Assembles a regex from stored blacklist
function makeRegexAndEnforceCensorship() {
  chrome.storage.sync.get("triggers", function(items) {
    var bannedWords = items["triggers"];
    var escapedBannedWords = $.map(bannedWords, function(val, key) {
      return "\\b" + escapeRegExp(key) + "\\b";
    });
    var regexString = escapedBannedWords.join("|");
    if (regexString == "") {
      // Rejects everything
      regexString = "[^\\w\\W]";
    }
    re = new RegExp(regexString, "i");
    regexNeedsUpdate = false;
    // Start blurring loop.
    enforceCensorship(re);
  });
}

// Initiates censorship loop.
makeRegexAndEnforceCensorship();

// When the blacklist changes the regex needs to be updated
chrome.storage.onChanged.addListener(function(changes, namespace){
  regexNeedsUpdate = true;
});