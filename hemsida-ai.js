/* Flytt & Fräscht: kostnadsfri, helt lokal regelbaserad rådgivare utan API-anrop.
   Inga uppgifter sparas automatiskt eller skickas förrän kunden själv klickar Skicka. */
(()=>{
 'use strict';
 const root=document.getElementById('ff-ai-widget');
 if(!root)return;
 const messages=root.querySelector('#ff-ai-messages');
 const status=root.querySelector('#ff-ai-status');
 const form=root.querySelector('#ff-ai-form');
 const input=root.querySelector('#ff-ai-input');
 const send=root.querySelector('#ff-ai-send');
 const toQuote=root.querySelector('#ff-ai-toquote');
 const history=[];
 const maxHistory=6;
 let busy=false;

 function bubble(role,text){
   const el=document.createElement('div');el.className='ff-ai-msg';el.dataset.role=role;
   el.textContent=text;messages.append(el);messages.scrollTop=messages.scrollHeight;
 }
 function setBusy(value){busy=value;send.disabled=value;input.disabled=value;status.textContent=value?'Tar fram ett svar…':'Kostnadsfri flyttguide';}
 function guide(text){
  const lower=text.toLocaleLowerCase('sv-SE');
  if(/flyttstäd|städ|fönster/.test(lower))return 'För att planera städningen är det bra att ange bostadens storlek, önskat datum, om bostaden är tömd och om fönsterputs behövs. Välj tjänsten i offertformuläret så får vi rätt uppgifter.';
  if(/pack|kartong|ömtålig|piano|soffa|möbel/.test(lower))return 'Beskriv gärna vilka stora eller ömtåliga saker som ingår och ungefär antal kartonger. Om du behöver packhjälp kan du lägga till det i offerten.';
  if(/pris|kost|rut|rabatt/.test(lower))return 'Vi ger ett personligt pris efter att ha fått uppgifter om uppdraget. Arbetskostnad för vissa tjänster kan omfattas av RUT om villkoren uppfylls. Jag kan inte lova ett belopp eller ett visst avdrag.';
  if(/datum|ledig|boka|kalender/.test(lower))return 'Ange önskat datum i offertformuläret. Datumet behöver bekräftas av oss innan en bokning är klar – jag kan inte se personalens lediga tider här.';
  if(/flytt|transport|adress|hiss|trapp/.test(lower))return 'Berätta gärna ungefär hur många rum du flyttar, mellan vilka områden, om det finns hiss, parkeringsmöjlighet och om du vill ha packning eller flyttstädning. Dessa detaljer hjälper oss ge en bra offert.';
  return 'Jag kan hjälpa dig att planera flytt, transport, flyttstädning och hemstädning. Välj gärna ett av ämnena nedan eller beskriv vad du behöver. För bindande pris eller datum skickar du en offertförfrågan.';
 }
 function privateInfo(value){return /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value)||/\b(?:\+46|0)[\d\s-]{7,15}\d\b/.test(value);}
 function ask(text){
   if(busy)return;
   const content=text.trim().slice(0,500);
   if(!content)return;
   if(privateInfo(content) || /\b\d{6}[-+]?\d{4}\b/.test(content)){
     bubble('assistant','Skriv inte personnummer, telefonnummer eller mejladress här. Kontaktuppgifter fyller du i direkt i offertformuläret.');
     return;
   }
   bubble('user',content);
   history.push({role:'user',content});
   if(history.length>maxHistory)history.shift();
   const answer=guide(content);
   bubble('assistant',answer);
   history.push({role:'assistant',content:answer});
   if(history.length>maxHistory)history.shift();
 }
 form.addEventListener('submit',e=>{e.preventDefault();const message=input.value;input.value='';ask(message);});
 root.querySelectorAll('[data-ff-ai-prompt]').forEach(button=>button.addEventListener('click',()=>ask(button.dataset.ffAiPrompt)));
 toQuote.addEventListener('click',()=>{
   const notes=document.getElementById('g');
   const service=document.getElementById('s');
   const asked=history.filter(item=>item.role==='user').map(item=>item.content).slice(-3);
   if(asked.length&&notes){
    const addition='Önskemål från planeringsguiden: '+asked.join(' / ');
    const existing=notes.value.trim().replace(/\n?Önskemål från planeringsguiden:[^\n]*/g,'');
    const next=[existing,addition].filter(Boolean).join('\n');
    notes.value=next.slice(0,notes.maxLength>0?notes.maxLength:1800);
    notes.dispatchEvent(new Event('input',{bubbles:true}));
   }
   if(service && asked.length){
    const all=asked.join(' ').toLocaleLowerCase('sv-SE');
    const opt=[...service.options].find(o=> /flyttstäd/i.test(all)? /flyttstäd/i.test(o.text): /hemstäd/i.test(all)?/hemstäd/i.test(o.text):/flytt|transport/i.test(all)?/komplett flytt/i.test(o.text):false);
    if(opt){service.value=opt.value;service.dispatchEvent(new Event('change',{bubbles:true}));}
   }
   const target=document.getElementById('f');if(target)target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
   if(notes)notes.focus({preventScroll:true});
 });
 bubble('assistant','Hej! Jag hjälper dig att planera flytt eller städning. Vad behöver du hjälp med? Du kan börja med en fråga eller välja ett ämne nedan.');
})();
