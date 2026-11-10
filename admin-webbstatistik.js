/* Flytt & Fräscht – endast admininloggade kan läsa statistik (RLS). */
(function () {
 'use strict';
 const cfg=window.FLYTT_CONFIG||{};
 const overview=document.getElementById('overviewPanel');
 if(!overview || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
 const panel=document.createElement('section');
 panel.className='ff-webstats';
 panel.setAttribute('aria-labelledby','ff-webstats-title');
 panel.innerHTML='<h2 id="ff-webstats-title">Hemsidans offertflöde · 30 dagar</h2>'+
  '<p>Cookiefri, anonym händelsestatistik. En sidvisning är inte en unik besökare.</p>'+
  '<div class="ff-webstats-summary" aria-live="polite">'+
  '<div><strong id="ff-ws-views">–</strong><span>Sidvisningar</span></div>'+
  '<div><strong id="ff-ws-starts">–</strong><span>Påbörjade formulär</span></div>'+
  '<div><strong id="ff-ws-sent">–</strong><span>Skickade formulär</span></div>'+
  '<div><strong id="ff-ws-bookings">–</strong><span>Kommande bokade uppdrag*</span></div>'+
  '</div><p class="ff-webstats-details">*Ej avbokade uppdrag de kommande 14 dagarna. Inte ett mått på personalens ledighet.</p>'+
  '<p class="ff-webstats-status" id="ff-ws-status" role="status"></p>'+
  '<button type="button" id="ff-ws-refresh">Uppdatera webbstatistik</button>';
 overview.append(panel);
 const $=id=>document.getElementById(id);
 let loading=false;
 let fetchedAt=0;
 const format=n=>Number(n).toLocaleString('sv-SE');
 async function refresh(){
  if(loading || document.getElementById('dashboard')?.hidden) return;
  let session;
  try{session=JSON.parse(sessionStorage.getItem('flytt_admin_session')||'null');}catch(_){return;}
  if(!session?.token)return;
  loading=true;$('ff-ws-status').textContent='Hämtar statistik…';
  const daysAgo=new Date();daysAgo.setDate(daysAgo.getDate()-29);
  const from=daysAgo.toLocaleDateString('sv-SE');
  const dateToday=new Date();const to=new Date(dateToday);to.setDate(to.getDate()+14);
  const url=cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/';
  const headers={'apikey':cfg.supabaseAnonKey,'Authorization':'Bearer '+session.token};
  try{
   const a=await fetch(url+'ff_web_events_daily?select=event,total&day=gte.'+encodeURIComponent(from)+'&limit=500', {headers,cache:'no-store'});
   if(!a.ok)throw new Error(a.status===404?'Kör först SQL-filen i Supabase.':'Statistiken kunde inte läsas (HTTP '+a.status+').');
   const rows=await a.json();
   const sum=name=>rows.filter(r=>r.event===name).reduce((acc,r)=>acc+Number(r.total||0),0);
   $('ff-ws-views').textContent=format(sum('page_view'));
   $('ff-ws-starts').textContent=format(sum('quote_start'));
   $('ff-ws-sent').textContent=format(sum('quote_sent'));
   // Uses existing admin-protected bokningar table; fetch no customer personal data.
   try{
    const bookingUrl=url+'bokningar?select=datum,status&datum=gte.'+dateToday.toLocaleDateString('sv-SE')+'&datum=lte.'+to.toLocaleDateString('sv-SE')+'&limit=1000';
    const b=await fetch(bookingUrl,{headers,cache:'no-store'});
    if(!b.ok)throw new Error('Bokningar kunde inte hämtas');
    const upcoming=(await b.json()).filter(row=>row.status!=='avbokad');
    $('ff-ws-bookings').textContent=format(upcoming.length);
   }catch(_){$('ff-ws-bookings').textContent='–';}
   $('ff-ws-status').textContent='Uppdaterad '+new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})+'. Statistiken börjar räknas från aktivering.';
   fetchedAt=Date.now();
  }catch(e){$('ff-ws-status').textContent=e.message;}
  finally{loading=false;}
 }
 $('ff-ws-refresh').addEventListener('click',refresh);
 const observer=new MutationObserver(()=>{
  if(!document.getElementById('dashboard')?.hidden && !overview.hidden && Date.now()-fetchedAt>60000)refresh();
 });
 observer.observe(document.getElementById('dashboard')||document.body,{attributes:true,attributeFilter:['hidden'],subtree:true});
 setInterval(()=>{if(!overview.hidden && !document.getElementById('dashboard')?.hidden && Date.now()-fetchedAt>120000)refresh();},60000);
})();
