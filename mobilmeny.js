/* Flytt & Fräscht: tillgänglig mobilmeny, utan ändringar i offertsystemet. */
(function(){
  'use strict';
  const button=document.querySelector('.ff-menu-toggle');
  const panel=document.getElementById('ff-mobile-menu');
  const backdrop=document.getElementById('ff-menu-backdrop');
  if(!button||!panel||!backdrop)return;
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
    if(restoreFocus)button.focus();
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
    const first=panel.querySelector('a');if(first)first.focus();
  }
  button.addEventListener('click',()=>isOpen()?close(true):open());
  backdrop.addEventListener('click',()=>close(true));
  panel.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>close(false)));
  document.addEventListener('keydown',function(e){
    if(!isOpen())return;
    if(e.key==='Escape'){e.preventDefault();close(true);return;}
    if(e.key==='Tab'){
      const items=[button,...panel.querySelectorAll('a')];
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  window.addEventListener('resize',()=>{if(window.innerWidth>860)close(false)});
})();
