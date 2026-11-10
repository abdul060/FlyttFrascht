/* Flytt & Fräscht – A/B-resultat, endast via befintlig admininloggning. */
(function(){
 'use strict';
 const cfg=window.FLYTT_CONFIG||{};
 const overview=document.getElementById('overviewPanel');
 if(!overview || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
 const section=document.createElement('section');
 section.className='ff-ab-panel';
 section.setAttribute('aria-labelledby','ff-ab-heading');
 section.innerHTML='<h2 id="ff-ab-heading">Test av offertknapp · senaste 30 dagarna</h2>'+
  '<p>Två texter testas på startsidans stora offertknapp. Visningar och förfrågningar är händelser, inte unika personer. Resultatet är vägledande.</p>'+
  '<div class="ff-ab-grid">'+
  '<div><h3>Alternativ A</h3><p class="ff-ab-caption">Få offert på din flytt</p><strong id="ff-ab-a-rate">–</strong><small>Skickade / sidvisningar</small><p id="ff-ab-a-numbers">–</p></div>'+
  '<div><h3>Alternativ B</h3><p class="ff-ab-caption">Få en personlig offert</p><strong id="ff-ab-b-rate">–</strong><small>Skickade / sidvisningar</small><p id="ff-ab-b-numbers">–</p></div></div>'+
  '<p class="ff-ab-note">Måttet kan påverkas av att besökare återkommer, annonsblockerare och att en förfrågan kan ha påbörjats innan testet. Utse ingen vinnare på några få besök.</p>'+
  '<p id="ff-ab-status" role="status"></p><button type="button" id="ff-ab-refresh">Uppdatera A/B-test</button>';
 overview.append(section);
 const $=id=>document.getElementById(id);
 const fmt=n=>Number(n).toLocaleString('sv-SE');
 let busy=false;
 async function refresh(){
  if(busy || document.getElementById('dashboard')?.hidden)return;
  let session;
  try{session=JSON.parse(sessionStorage.getItem('flytt_admin_session')||'null');}catch(_){session=null;}
  if(!session?.token){$('ff-ab-status').textContent='Logga in i adminpanelen först.';return;}
  busy=true;$('ff-ab-status').textContent='Hämtar A/B-statistik…';
  const date=new Date();date.setDate(date.getDate()-29);
  const from=date.toLocaleDateString('sv-SE');
  const names=['ab_a_view','ab_b_view','ab_a_start','ab_b_start','ab_a_sent','ab_b_sent'];
  const params=new URLSearchParams({select:'event,total',day:'gte.'+from,event:'in.('+names.join(',')+')',limit:'1000'});
  const url=cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/ff_web_events_daily?'+params.toString();
  try {
   const res=await fetch(url,{headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+session.token},cache:'no-store'});
   if(!res.ok)throw new Error('Statistiken kunde inte hämtas (HTTP '+res.status+').');
   const rows=await res.json();
   const sum=name=>rows.filter(r=>r.event===name).reduce((s,r)=>s+Number(r.total||0),0);
   for(const v of ['a','b']){
    const views=sum('ab_'+v+'_view'),starts=sum('ab_'+v+'_start'),sent=sum('ab_'+v+'_sent');
    $("ff-ab-"+v+"-rate").textContent=views?(100*sent/views).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %':'–';
    $("ff-ab-"+v+"-numbers").textContent=fmt(views)+' visningar · '+fmt(starts)+' startade · '+fmt(sent)+' skickade';
   }
   $('ff-ab-status').textContent='Uppdaterad '+new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})+'.';
  }catch(e){$('ff-ab-status').textContent=e.message;}
  finally {busy=false;}
 }
 $('ff-ab-refresh').addEventListener('click',refresh);
})();
