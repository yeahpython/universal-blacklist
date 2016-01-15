function enforceCensorship() {
  $("p, span").filter(":contains('eugeni'):not(.censorship-blur, .censorship-hover)")
    .addClass("censorship-blur")
    .hover(function(){
    	$(this).addClass("censorship-hover");
        $(this).removeClass("censorship-blur");
	  }, function(){
	    $(this).addClass("censorship-blur");
	    $(this).removeClass("censorship-hover");
	  });
  setTimeout(enforceCensorship, 1000);
}
enforceCensorship();