/* Flytt & Fräscht – tillgänglig mobilmeny. */
(function(){
 'use strict';
 const button=document.querySelector('.ff-menu-toggle');
 const panel=document.getElementById('ff-mobile-menu');
 const backdrop=document.getElementById('ff-menu-backdrop');
 if(!button||!panel||!backdrop)return;
 const closeButton=panel.querySelector('.ff-menu-close');
 let priorFocus=null;
 const isOpen=()=>button.getAttribute('aria-expanded')==='true';
 function close(restoreFocus){
   if(!isOpen())return;
   button.setAttribute('aria-expanded','false');
   button.setAttribute('aria-label','Öppna menyn');
   panel.classList.remove('is-open');
   panel.setAttribute('aria-hidden','true');
   panel.setAttribute('inert','');
   backdrop.hidden=true;
   document.body.classList.remove('ff-menu-open');
   if(restoreFocus)(priorFocus&&priorFocus.isConnected?priorFocus:button).focus();
 }
 function open(){
   if(isOpen())return;
   priorFocus=document.activeElement;
   button.setAttribute('aria-expanded','true');
   button.setAttribute('aria-label','Stäng menyn');
   panel.removeAttribute('inert');
   panel.setAttribute('aria-hidden','false');
   panel.classList.add('is-open');
   backdrop.hidden=false;
   document.body.classList.add('ff-menu-open');
   if(closeButton)closeButton.focus();
 }
 button.addEventListener('click',()=>isOpen()?close(true):open());
 if(closeButton)closeButton.addEventListener('click',()=>close(true));
 backdrop.addEventListener('click',()=>close(true));
 panel.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>close(false)));
 document.addEventListener('keydown',function(e){
   if(!isOpen())return;
   if(e.key==='Escape'){e.preventDefault();close(true);return;}
   if(e.key==='Tab'){
     const focusables=[...(closeButton?[closeButton]:[]),...panel.querySelectorAll('a')];
     if(!focusables.length)return;
     const first=focusables[0],last=focusables[focusables.length-1];
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
 });
 window.addEventListener('resize',()=>{if(window.innerWidth>860)close(false)});
})();
