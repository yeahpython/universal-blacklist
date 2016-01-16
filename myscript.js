function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
var re;
var regexNeedsUpdate = true;
function enforceCensorship() {
  $("p, span")
    .filter(":not(.censorship-blur, .censorship-hover)")
	  .filter(function(){
	  	return re.test($(this).text());
	  })
    .addClass("censorship-blur")
    .hover(function(){
    	$(this).addClass("censorship-hover");
        $(this).removeClass("censorship-blur");
	  }, function(){
	    $(this).addClass("censorship-blur");
	    $(this).removeClass("censorship-hover");
	  });
  if (regexNeedsUpdate) {
    // clear old censorship
    $("p, span").filter(".censorship-blur")
      .removeClass(".censorship-blur");
    $("p, span").filter(".censorship-hover")
      .removeClass(".censorship-hover");
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