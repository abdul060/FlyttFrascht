/* Kopplar smarta verktyg och rekommendationslänkar till BEFINTLIGT offertflöde. */
(()=>{'use strict';
const qs=new URLSearchParams(location.search),toText=s=>String(s||'').trim();
const approved={flytt:'multi-flytt',flyttstad:'multi-flyttstad',hemstad:'multi-hemstad',fonster:'multi-fonster',bar:'multi-bar',sno:'multi-sno'};
const packages=new Set(['flyttkalkylator','flyttstadning','helaflytten','stadklart','eget-paket']);
function prefill(){
 const service=qs.get('ff_tjanster');
 if(service){const picks=[...new Set(service.split(',').filter(x=>Object.hasOwn(approved,x)))];const select=document.getElementById('s');if(select){
 const multi=picks.length>=2;select.value=multi?'Flera tjänster':picks.length===1?({'flytt':'Komplett flytt & transport','flyttstad':'Flyttstädning','hemstad':'Hemstädning','fonster':'Fönsterputs','bar':'Bärhjälp & packning','sno':'Snöskottning'})[picks[0]]:select.value;
 select.dispatchEvent(new Event('change',{bubbles:true}));if(multi)picks.forEach(p=>{const x=document.getElementById(approved[p]);if(x){x.checked=true;x.dispatchEvent(new Event('change',{bubbles:true}));}});
 }}
 const m=qs.get('ff_m2');if(/^\d{2,3}$/.test(m||'')){const area=document.getElementById('m');if(area){area.value=String(Math.max(15,Math.min(250,Number(m))));area.dispatchEvent(new Event('input',{bubbles:true}));}}
 const tag=qs.get('ff_paket');if(packages.has(tag||'')){
 const notes=[];if(tag==='flyttkalkylator'){notes.push('Kommer från flyttkalkylatorn (illustrativ beräkning).');const km=qs.get('ff_km');if(/^\d{1,3}$/.test(km||''))notes.push('Ungefärligt flyttavstånd: '+km+' km.');if(qs.get('ff_pack')==='1')notes.push('Önskar hjälp med packning.');}
 else notes.push('Förfrågan gäller ett kombinerat flyttpaket ('+tag.replace(/-/g,' ')+').');
 const g=document.getElementById('g');if(g&&!g.value.trim())g.value=notes.join('\n');
 }
 const ref=toText(qs.get('ff_ref')).toUpperCase();if(/^FF-[A-F0-9]{12}$/.test(ref)){
 const form=document.getElementById('f');if(form&&!document.getElementById('ffReferralAlert')){const p=document.createElement('p');p.className='ff-referral-note';p.id='ffReferralAlert';p.textContent='Du kom via en personlig rekommendation ('+ref+'). Koden följer med din offertförfrågan. Eventuella erbjudanden bekräftas separat.';form.prepend(p);}
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prefill,{once:true});else prefill();
})();
