var semanticModules = "div, p, span, h1, h2, h3, h4, h5, h6, a, button" +
", [class*=item], [class*=Item], [class*=entry], [class*=Entry]" +
", .userContentWrapper"; // Facebook



// Escape bad characters from user input.
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// This will be a regex that matches blacklisted strings
var re;

// Set to true when the user updates the blacklist
var regexNeedsUpdate = true;

function enforceCensorship() {
  var $newblur = $(semanticModules)
    .filter(function(){
      var match = re.exec($(this).contents()
        .filter(function() {
          return this.nodeType === 3; //Node.TEXT_NODE
        }).text());
      if (match === null) {
        return false;
      } else {
        //$(this).prepend($("<div/>").text("(" + match + ")").addClass("match"));
        //$(this).css("alt", match);
        return true;
      }
      // return re.test($(this).text());
    })
    .addClass("my-temp")
    .filter(":not(.my-temp .my-temp)")
    .addClass("new-censorship-blur");
  $(".my-temp").removeClass("my-temp");
  // my hope is that these gymnastics mean we don't have to constantly re-render the shadows in the cache.
  // but who knows?
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
  chrome.storage.sync.get("blacklist", function(items) {
    var bannedWords = items["blacklist"];
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
    callback();
  });
}

// Initiates censorship loop.
censorshipLoop();

// When the blacklist changes the regex needs to be updated
chrome.storage.onChanged.addListener(function(changes, namespace){
  regexNeedsUpdate = true;
});