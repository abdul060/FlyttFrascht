/* Den här rutan öppnas ENDAST när den befintliga #res-bekräftelsen visas efter lyckat skick. */
(function(){
  'use strict';
  function init(){
    var success=document.getElementById('res');
    var dialog=document.getElementById('ff-success-dialog');
    if(!success||!dialog||typeof dialog.showModal!=='function'||!window.MutationObserver)return;
    var x=document.getElementById('ff-success-x');
    var done=document.getElementById('ff-success-done');
    var isAlreadyShown=false;
    function close(){if(dialog.open)dialog.close();}
    if(x)x.addEventListener('click',close);
    if(done)done.addEventListener('click',close);
    dialog.addEventListener('click',function(e){if(e.target===dialog)close();});
    new MutationObserver(function(){
      if(!success.classList.contains('on')){isAlreadyShown=false;return;}
      if(isAlreadyShown||dialog.open)return;
      isAlreadyShown=true;
      try{dialog.showModal();}catch(e){/* Inline-bekräftelsen fungerar som reserv. */}
    }).observe(success,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
