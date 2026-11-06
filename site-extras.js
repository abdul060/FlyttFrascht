(function(){'use strict';
const service=document.getElementById('guide-service');const size=document.getElementById('guide-size');const rooms=document.getElementById('guide-rooms');const out=document.getElementById('guide-size-output');const next=document.getElementById('guide-cta');
if(!service||!size||!rooms||!out||!next)return;
size.addEventListener('input',()=>{out.textContent=size.value+' m²'});
next.addEventListener('click',()=>{const target=document.getElementById('offert');const s=document.getElementById('s'),m=document.getElementById('m'),mv=document.getElementById('mv');if(s)s.value=service.value;if(m){m.value=size.value;m.dispatchEvent(new Event('input',{bubbles:true}));}if(mv)mv.textContent=size.value;const radio=document.querySelector('input[name="r"][value="'+rooms.value+'"]');if(radio)radio.checked=true;target?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
})();
