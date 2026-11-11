/* Flytt & Fräscht – områdesval, offertförlopp och snabbkontakt. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  document.querySelectorAll('[data-ff-area]').forEach(button=>{
    button.addEventListener('click',()=>{
      const area=button.getAttribute('data-ff-area');
      const address=$('a');
      // Ett uttryckligt klick på en områdesknapp ska ersätta tidigare
      // områdesförslag, även om sidan öppnades från t.ex. en Solna-länk.
      if(address){
        address.value=area;
        address.dispatchEvent(new Event('input',{bubbles:true}));
      }
      // Samma val används för flyttens från-område.
      const origin=$('move-from');
      if(origin){
        origin.value=area;
        origin.dispatchEvent(new Event('input',{bubbles:true}));
      }
      // Hashen ändras bara vid första klicket. Scrolla därför uttryckligen
      // vid VARJE områdesval, även om URL:en redan slutar med #offert.
      if(location.hash!=='#offert')location.hash='offert';
      const focusTarget=$('n');
      if(focusTarget)focusTarget.focus({preventScroll:true});
      const quoteSection=$('offert');
      if(quoteSection){
        requestAnimationFrame(()=>{
          quoteSection.scrollIntoView({behavior:'smooth',block:'start'});
        });
      }
    });
  });
  const form=$('f'), progress=$('ffFormProgress');
  if(form && progress){
    const fields=[{el:$('n'),valid:el=>el.value.trim().length>0},
      {el:$('p'),valid:el=>el.value.replace(/\D/g,'').length>=7},
      {el:$('s'),valid:el=>el.value.trim().length>0},
      {el:$('a'),valid:el=>el.value.trim().length>0 || $('move-from')?.value.trim().length>0},
      {el:$('d'),valid:el=>!!el.value}];
    const active=fields.filter(x=>x.el), bar=$('ffFormProgressBar'),label=$('ffFormProgressLabel'),track=progress.querySelector('[role=progressbar]');
    const update=()=>{
      const complete=active.filter(x=>x.valid(x.el)).length;
      const pct=Math.round(complete/active.length*100);
      if(bar)bar.style.width=pct+'%';
      if(track)track.setAttribute('aria-valuenow',String(pct));
      if(label)label.textContent=complete===active.length?'Grunduppgifterna är ifyllda – granska och skicka':`${complete} av ${active.length} grunduppgifter ifyllda`;
    };
    form.addEventListener('input',update);
    form.addEventListener('change',update);
    update();
  }
  document.querySelectorAll('[data-ff-close-contact]').forEach(a=>a.addEventListener('click',()=>{
    const details=a.closest('details');if(details)details.open=false;
  }));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const d=document.querySelector('.ff-contact-menu[open]');if(d)d.open=false;
    }
  });
})();
