function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
var modcount = 0;
var re;
var regexNeedsUpdate = true;
function enforceCensorship() {
  var ruleSetTime = modcount;

  var mouseOverHandler = function(){
    if (ruleSetTime == modcount) {
      $(this).addClass("censorship-hover");
    } else {
      // this is some horribly imperfect cleanup... whatever
      $(this).unbind('mouseover', mouseOverHandler);
    }
    $(this).removeClass("censorship-blur");
  };

  var mouseOutHandler = function() {
    if (ruleSetTime == modcount) {
      $(this).addClass("censorship-blur");
    } else {
      $(this).unbind('mouseout', mouseOutHandler);
    }
    $(this).removeClass("censorship-hover");
  };

  $("p, span")
    .filter(":not(.censorship-blur, .censorship-hover)")
	  .filter(function(){
	  	return re.test($(this).text());
	  })
    .addClass("censorship-blur")
    .hover(mouseOverHandler, mouseOutHandler);
  if (regexNeedsUpdate) {
    // clear old censorship
    modcount += 1;
    $("p, span").filter(".censorship-blur")
      .removeClass("censorship-blur");
    $("p, span").filter(".censorship-hover")
      .removeClass("censorship-hover");
    setTimeout(makeRegexAndEnforceCensorship, 1000);
  } else {
    setTimeout(enforceCensorship, 1000);
  }
}

function makeRegexAndEnforceCensorship() {
  chrome.storage.sync.get("triggers", function(items) {
    var bannedWords = items["triggers"];
    var escapedBannedWords = $.map(bannedWords, function(val, key) {
      return escapeRegExp(key);
    });
    var regexString = escapedBannedWords.join("|");
    if (regexString == "") {
      regexString = "[^\\w\\W]";
    }
    console.log("regexString is", regexString);
    re = new RegExp(regexString);
    regexNeedsUpdate = false;
    enforceCensorship(re);
  });
}

makeRegexAndEnforceCensorship();
chrome.storage.onChanged.addListener(function(changes, namespace){
  regexNeedsUpdate = true;
});