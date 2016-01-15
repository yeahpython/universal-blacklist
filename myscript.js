$("p:contains('the')")
  .addClass("censorship-blur")
  .hover(function(){
  	$(this).removeClass("censorship-blur");
  }, function(){
  	$(this).addClass("censorship-blur");
  });