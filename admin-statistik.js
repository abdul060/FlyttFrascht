/* Flytt & Fräscht – fristående läsbaserad adminstatistik. Inga ändringar av admin.js eller databasen. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const tab = document.querySelector('[data-tab="statistics"]');
  const panel = $('statisticsPanel');
  if (!tab || !panel || !window.FLYTT_CONFIG) return;
  const cfg = window.FLYTT_CONFIG;
  const base = String(cfg.supabaseUrl || '').replace(/\/$/, '');
  const apiKey = cfg.supabaseAnonKey;
  const MAX_ROWS = 10000;
  const data = {requests: [], offers: [], bookings: []};
  let loaded = false, loading = false, lastLoaded = 0, truncated = false;
  const nowMonth = () => {const d = new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  const ym = s => String(s || '').slice(0, 7);
  const SEK = v => new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK',maximumFractionDigits:0}).format(v);
  const num = v => new Intl.NumberFormat('sv-SE').format(v);
  const p = $('ffStatsMonth');
  p.value = nowMonth(); p.max = nowMonth();
  function cell(tag, text, cls) {const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e;}
  function clear(id){const e=$(id);e.replaceChildren();return e;}
  function currentToken(){try {return JSON.parse(sessionStorage.getItem('flytt_admin_session') || '{}').token || '';}catch {return '';}}
  async function pageAll(table, columns, dateColumn){
    const rows = [];
    for(let offset=0;offset<MAX_ROWS;offset+=1000){
      const token = currentToken();
      if (!token) throw Error('Du är inte inloggad. Logga in i adminpanelen igen.');
      const params = new URLSearchParams({select:columns,order:`${dateColumn}.asc`,limit:'1000',offset:String(offset)});
      const res=await fetch(`${base}/rest/v1/${table}?${params}`,{headers:{apikey:apiKey,Authorization:`Bearer ${token}`},cache:'no-store'});
      if(!res.ok)throw Error(res.status===401?'Inloggningen har gått ut. Uppdatera adminpanelen och logga in igen.':`${table} kunde inte läsas (${res.status}).`);
      const chunk=await res.json();
      if(!Array.isArray(chunk))throw Error('Felaktigt svar från Supabase.');
      rows.push(...chunk);
      if(chunk.length<1000)return rows;
    }
    truncated=true;return rows;
  }
  async function refresh(force=false){
    if(loading || (!force && loaded && Date.now()-lastLoaded<25000))return;
    if($('dashboard').hidden)return;
    loading=true;
    $('ffStatsRefresh').disabled=true;
    $('ffStatsStatus').textContent='Hämtar statistik från Supabase…';
    try {
      truncated=false;
      // Endast de fält som statistiken behöver. Inga namn, telefonnummer eller adresser hämtas.
      const [requests,offers,bookings]=await Promise.all([
        pageAll('offertforfragningar','id,skapad,tjanst,status','skapad'),
        pageAll('offerter','id,skapad,tjanst,status,kundbeslut,pris_inkl_moms','skapad'),
        pageAll('bokningar','id,datum,status,tjanst','datum')
      ]);
      data.requests=requests;data.offers=offers;data.bookings=bookings;
      lastLoaded=Date.now();loaded=true;
      render();
      $('ffStatsStatus').textContent=(truncated?'Observera: fler än 10 000 poster i minst en kategori. Statistiken kan vara ofullständig. ':'')+'Uppdaterad '+new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})+'.';
    }catch(err){$('ffStatsStatus').textContent='Kunde inte hämta statistik: '+err.message;}
    finally{loading=false;$('ffStatsRefresh').disabled=false;}
  }
  const ratio=(v,all)=>all?Math.round(v/all*100):0;
  const monthLabel=m=>{const [y,n]=m.split('-').map(Number);return new Date(y,n-1,1).toLocaleDateString('sv-SE',{month:'short',year:'numeric'});};
  function monthSeries(m){const [y,n]=m.split('-').map(Number);return Array.from({length:6},(_,i)=>{const d=new Date(y,n-6+i,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;});}
  function statCard(parent, label, value, detail){const c=cell('article',undefined,'ff-stats-kpi');c.append(cell('span',label,'ff-stats-kpi-label'),cell('strong',value,'ff-stats-kpi-value'),cell('small',detail,'ff-stats-kpi-detail'));parent.append(c);}
  function empty(target,message){target.append(cell('p',message,'ff-stats-empty'));}
  function barList(target,arr){
    target.replaceChildren();
    const high=Math.max(1,...arr.map(x=>x.value));
    for(const item of arr){
      const row=cell('div',undefined,'ff-stats-service-row');
      const top=cell('div',undefined,'ff-stats-service-top');top.append(cell('span',item.name),cell('strong',num(item.value)));
      const rail=cell('div',undefined,'ff-stats-service-rail');
      const fill=cell('div',undefined,'ff-stats-service-fill');fill.style.width=(item.value/high*100)+'%';rail.append(fill);
      row.append(top,rail);target.append(row);
    }
  }
  function render(){
    if(!loaded)return;
    const m=p.value||nowMonth();
    const requests=data.requests.filter(r=>ym(r.skapad)===m);
    const offers=data.offers.filter(o=>ym(o.skapad)===m);
    const bookings=data.bookings.filter(b=>ym(b.datum)===m);
    const sent=offers.filter(o=>o.status==='skickad');
    const accepted=sent.filter(o=>o.kundbeslut==='accepterad');
    const declined=sent.filter(o=>o.kundbeslut==='avbojd');
    const waiting=sent.filter(o=>!o.kundbeslut||o.kundbeslut==='ej_svar');
    const acceptedValue=accepted.reduce((v,o)=>v+(Number(o.pris_inkl_moms)||0),0);
    const done=bookings.filter(b=>b.status==='utford');
    const active=bookings.filter(b=>b.status!=='avbokad');
    const kpis=clear('ffStatsKpis');
    statCard(kpis,'Förfrågningar',num(requests.length),'Inkomna under vald månad');
    statCard(kpis,'Skickade offerter',num(sent.length),'Skapade denna månad');
    statCard(kpis,'Accepterade offerter',num(accepted.length),`${ratio(accepted.length,sent.length)} % av skickade`);
    statCard(kpis,'Bokade jobb',num(active.length),`${done.length} utförda under månaden`);
    statCard(kpis,'Accepterat offertvärde',SEK(acceptedValue),'Inkl. moms · inte omsättning');
    const months=monthSeries(m), trend=clear('ffStatsTrend'), monthly=months.map(x=>data.requests.filter(r=>ym(r.skapad)===x).length);
    const high=Math.max(1,...monthly);
    for(let i=0;i<months.length;i++){
      const e=cell('div',undefined,'ff-stats-trend-month');
      const bar=cell('div',undefined,'ff-stats-trend-bar');bar.style.height=`${Math.max(monthly[i]?5:2,monthly[i]/high*100)}%`;
      const wrap=cell('div',undefined,'ff-stats-trend-rail');wrap.append(bar);
      e.append(cell('strong',num(monthly[i])),wrap,cell('span',monthLabel(months[i])));
      e.title=`${monthLabel(months[i])}: ${monthly[i]} förfrågningar`;trend.append(e);
    }
    const grouped=new Map();
    requests.forEach(r=>{const t=String(r.tjanst||'Ej angiven').trim()||'Ej angiven';grouped.set(t,(grouped.get(t)||0)+1);});
    const services=[...grouped].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,8);
    const svc=clear('ffStatsServices');if(services.length)barList(svc,services);else empty(svc,'Inga tjänster registrerade för månaden.');
    const of=clear('ffStatsOffers');barList(of,[{name:'Accepterade',value:accepted.length},{name:'Avböjda',value:declined.length},{name:'Väntar på svar',value:waiting.length},{name:'Utkast',value:offers.length-sent.length}]);
    of.append(cell('p',`Accepterade: ${ratio(accepted.length,sent.length)} % av skickade offerter från denna månad.`,'ff-stats-sub'));
    const bookingsRoot=clear('ffStatsBookings');const states=[['Utförda','utford'],['Bekräftade','bekraftad'],['Planerade','planerad'],['Avbokade','avbokad']];
    barList(bookingsRoot,states.map(([name,status])=>({name,value:bookings.filter(b=>b.status===status).length})));
  }
  const observer=new MutationObserver(()=>{
    const active=tab.classList.contains('active')&&!$('dashboard').hidden;
    panel.hidden=!active;
    if(active)refresh();
  });
  observer.observe(tab,{attributes:true,attributeFilter:['class']});
  // admin.js hanterar alla flikknappar; observern kompletterar med statistikens synlighet.
  $('ffStatsRefresh').addEventListener('click',()=>refresh(true));
  p.addEventListener('change',()=>{if(p.value>nowMonth())p.value=nowMonth();render();});
  setInterval(()=>{if(!panel.hidden&&!document.hidden)refresh();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!panel.hidden)refresh();});
})();
