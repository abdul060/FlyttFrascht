/* Flytt & Fräscht · adminarbetstider · ingen ändring av admin.js */
(()=>{'use strict';
 const $=id=>document.getElementById(id), tab=document.querySelector('[data-tab="workhours"]'), panel=$('workhoursPanel');
 if(!tab||!panel||!window.FLYTT_CONFIG)return;
 const cfg=window.FLYTT_CONFIG, base=String(cfg.supabaseUrl||'').replace(/\/$/,''),apiKey=cfg.supabaseAnonKey;
 const fmtInt=n=>new Intl.NumberFormat('sv-SE').format(n);
 const dur=s=>{const minutes=Math.max(0,Math.round(s/60));return `${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,'0')} min`};
 const date=s=>{if(!s)return '–';const d=new Date(String(s));return Number.isNaN(d.getTime())?'–':d.toLocaleString('sv-SE',{timeZone:'Europe/Stockholm',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
 const dateOnly=s=>String(s||'').slice(0,10);
 const mk=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);if(cls)e.className=cls;return e};
 const month= $('ffHoursMonth'),staff=$('ffHoursStaff'),status=$('ffHoursStatus');
 function stockholmMonth(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit'}).format(new Date()).replace(/^(\d{4})-(\d\d)$/,'$1-$2')}
 month.value=stockholmMonth();
 let entries=[],loadedMonth='',serverTime='',loading=false,truncated=false;
 function token(){try{return JSON.parse(sessionStorage.getItem('flytt_admin_session')||'{}').token||''}catch{return ''}}
 function actualWork(r){let n=Math.max(0,Number(r.work_seconds)||0);if(r.status==='running'&&r.segment_started_at){n+=Math.max(0,(Date.parse(serverTime||new Date().toISOString())-Date.parse(r.segment_started_at))/1000)}return Math.floor(n)}
 function actualPause(r){let n=Math.max(0,Number(r.pause_seconds)||0);if(r.status==='paused'&&r.paused_at){n+=Math.max(0,(Date.parse(serverTime||new Date().toISOString())-Date.parse(r.paused_at))/1000)}return Math.floor(n)}
 const selected=()=>staff.value?entries.filter(r=>r.staff_uid===staff.value):entries;
 const sortedPeople=rows=>{const m=new Map();rows.forEach(r=>{const id=String(r.staff_uid||'');const x=m.get(id)||{name:String(r.staff_name||'Okänd'),sec:0,passes:0,finished:0};x.sec+=actualWork(r);x.passes++;x.finished+=r.status==='finished'?1:0;m.set(id,x)});return [...m.entries()].map(([id,v])=>({id,...v})).sort((a,b)=>b.sec-a.sec)};
 function kpi(label,value,help){const e=mk('article',undefined,'ff-hours-kpi');e.append(mk('span',label),mk('strong',value),mk('small',help));return e}
 function redraw(){
  const rows=selected(),k=$('ffHoursKpis');k.replaceChildren();
  const seconds=rows.reduce((n,r)=>n+actualWork(r),0),pause=rows.reduce((n,r)=>n+actualPause(r),0);
  const finished=rows.filter(r=>r.status==='finished').length;
  const people=sortedPeople(rows);
  k.append(kpi('Arbetade timmar',dur(seconds),'Exklusive pauser'),kpi('Registrerade pass',fmtInt(rows.length),`${finished} avslutade`),kpi('Paustid',dur(pause),'Registrerade pauser'),kpi('Medarbetare',fmtInt(people.length),'Med registrerade pass'));
  const root=$('ffHoursPeople');root.replaceChildren();const max=Math.max(1,...people.map(p=>p.sec));
  if(!people.length)root.append(mk('p','Inga rapporter för det här urvalet.','ff-hours-empty'));
  for(const p of people){const line=mk('div',undefined,'ff-hours-person'),top=mk('div',undefined,'ff-hours-person-top');top.append(mk('strong',p.name),mk('span',`${dur(p.sec)} · ${p.passes} pass`));const track=mk('div',undefined,'ff-hours-person-track'),fill=mk('div',undefined,'ff-hours-person-fill');fill.style.width=(p.sec/max*100)+'%';track.append(fill);line.append(top,track);root.append(line)}
  const tbody=$('ffHoursRows');tbody.replaceChildren();
  if(!rows.length){const tr=mk('tr'),td=mk('td','Inga arbetspass registrerade för månaden.','ff-hours-empty');td.colSpan=8;tr.append(td);tbody.append(tr)}
  for(const r of rows){const tr=mk('tr');
   for(const v of [dateOnly(r.pass_date),String(r.staff_name||'–'),String(r.service||'Uppdrag'),date(r.started_at),date(r.finished_at),dur(actualWork(r)),dur(actualPause(r))])tr.append(mk('td',v));
   const td=mk('td'),pill=mk('span',r.status==='finished'?'Avslutad':r.status==='paused'?'Pausad':'Pågår','ff-hours-statuspill');pill.dataset.status=r.status;td.append(pill);tr.append(td);tbody.append(tr)
  }
  $('ffHoursExport').disabled=!rows.length;
  status.textContent=`${fmtInt(rows.length)} rapporter · Uppdaterad ${new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})}${truncated?' · OBS! Fler än 10 000 rapporter; statistiken är ofullständig.':''}.`;
 }
 async function refresh(force=false){
  if(loading||$('dashboard').hidden)return;
  if(!force&&loadedMonth===month.value)return redraw();
  const t=token();if(!t){status.textContent='Logga in igen i adminpanelen.';return}
  loading=true;$('ffHoursRefresh').disabled=true;status.textContent='Hämtar arbetstider från Supabase…';
  try{const u=new URL(`${base}/functions/v1/admin-arbetstider`);u.searchParams.set('month',month.value);
   const r=await fetch(u,{headers:{Authorization:'Bearer '+t,apikey:apiKey},cache:'no-store'});
   const body=await r.json().catch(()=>({}));if(!r.ok)throw Error(body.error||`Kunde inte läsa tidrapporter (${r.status})`);
   entries=Array.isArray(body.entries)?body.entries:[];serverTime=body.server_time||new Date().toISOString();truncated=!!body.truncated;loadedMonth=month.value;
   const old=staff.value;staff.replaceChildren(mk('option','Alla medarbetare'));staff.firstChild.value='';
   const names=new Map();entries.forEach(r=>names.set(r.staff_uid,r.staff_name||'Okänd'));
   for(const [id,name] of [...names].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'sv'))){const o=mk('option',name);o.value=id;staff.append(o)}
   if([...staff.options].some(o=>o.value===old))staff.value=old;
   redraw();
  }catch(e){status.textContent='Kunde inte hämta arbetstider: '+e.message}
  finally{loading=false;$('ffHoursRefresh').disabled=false}
 }
 function exportCSV(){const rows=selected();if(!rows.length)return;
  const safe=v=>{let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
  const data=[['Datum','Medarbetare','Tjänst','Start','Slut','Arbete (minuter)','Paus (minuter)','Status'],...rows.map(r=>[dateOnly(r.pass_date),r.staff_name||'',r.service||'',date(r.started_at),date(r.finished_at),Math.round(actualWork(r)/60),Math.round(actualPause(r)/60),r.status])];
  const csv='\ufeff'+data.map(row=>row.map(safe).join(';')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=`FlyttFrascht-arbetstider-${month.value}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 // admin.js hanterar befintliga [data-tab]-knappar och deras active-klass.
 const observer=new MutationObserver(()=>{const active=tab.classList.contains('active')&&!$('dashboard').hidden;panel.hidden=!active;if(active)refresh()});
 observer.observe(tab,{attributes:true,attributeFilter:['class']});
 // Fotogalleriet har egen navigering, och bör också kunna dölja arbetstidsfliken.
 const photoButton=document.querySelector('[data-photo-tab]');if(photoButton)photoButton.addEventListener('click',()=>{panel.hidden=true});
 $('ffHoursRefresh').addEventListener('click',()=>refresh(true));month.addEventListener('change',()=>{loadedMonth='';refresh(true)});staff.addEventListener('change',redraw);$('ffHoursExport').addEventListener('click',exportCSV);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!panel.hidden)refresh(true)});
})();
