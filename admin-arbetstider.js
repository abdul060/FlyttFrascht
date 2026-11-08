/* Flytt & Fräscht · adminarbetstider · förbättrad design för dator och mobil */
(()=>{'use strict';
 const $=id=>document.getElementById(id), tab=document.querySelector('[data-tab="workhours"]'), panel=$('workhoursPanel');
 if(!tab||!panel||!window.FLYTT_CONFIG)return;
 const cfg=window.FLYTT_CONFIG, base=String(cfg.supabaseUrl||'').replace(/\/$/,''), apiKey=cfg.supabaseAnonKey;
 const fmtInt=n=>new Intl.NumberFormat('sv-SE').format(n);
 const dur=s=>{const minutes=Math.max(0,Math.round(s/60));return `${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,'0')} min`};
 const date=s=>{if(!s)return '–';const d=new Date(String(s));return Number.isNaN(d.getTime())?'–':d.toLocaleString('sv-SE',{timeZone:'Europe/Stockholm',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
 const dateOnly=s=>String(s||'').slice(0,10);
 const mk=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);if(cls)e.className=cls;return e};
 const month=$('ffHoursMonth'), staff=$('ffHoursStaff'), status=$('ffHoursStatus');
 function stockholmMonth(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit'}).format(new Date()).replace(/^(\d{4})-(\d\d)$/,'$1-$2')}
 month.value=stockholmMonth();
 let entries=[], loadedMonth='', serverTime='', loading=false, truncated=false;
 const activeEntries=()=>selected().filter(r=>!r.is_voided);
 function token(){try{return JSON.parse(sessionStorage.getItem('flytt_admin_session')||'{}').token||''}catch{return ''}}
 function actualWork(r){let n=Math.max(0,Number(r.work_seconds)||0);if(r.status==='running'&&r.segment_started_at){n+=Math.max(0,(Date.parse(serverTime||new Date().toISOString())-Date.parse(r.segment_started_at))/1000)}return Math.floor(n)}
 function actualPause(r){let n=Math.max(0,Number(r.pause_seconds)||0);if(r.status==='paused'&&r.paused_at){n+=Math.max(0,(Date.parse(serverTime||new Date().toISOString())-Date.parse(r.paused_at))/1000)}return Math.floor(n)}
 const weekKey=value=>{const t=String(value||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return '';const dt=new Date(t+'T12:00:00Z');if(Number.isNaN(dt.getTime()))return '';const wd=(dt.getUTCDay()+6)%7;dt.setUTCDate(dt.getUTCDate()-wd+3);const yr=dt.getUTCFullYear(), jan4=new Date(Date.UTC(yr,0,4));return yr+'-W'+String(1+Math.round((dt-jan4)/604800000)).padStart(2,'0')};
 const extra=mk('div',undefined,'ff-hours-extra-controls');extra.id='ffHoursExtraControls';
 const makeSelect=(id,title,choices)=>{const label=mk('label',title);const el=document.createElement('select');el.id=id;for(const [value,text] of choices){const o=mk('option',text);o.value=value;el.append(o)}label.append(el);extra.append(label);return el};
 const searchLabel=mk('label','Sök bland arbetspassen'),search=document.createElement('input');search.type='search';search.id='ffHoursSearch';search.placeholder='Sök namn, tjänst eller datum…';search.autocomplete='off';searchLabel.append(search);extra.append(searchLabel);
 const state=makeSelect('ffHoursState','Status',[['','Alla statusar'],['finished','Avslutade'],['running','Pågående'],['paused','Pausade'],['voided','Makulerade']]);
 const week=makeSelect('ffHoursWeek','Vecka',[['','Alla veckor']]);
 const clear=mk('button','Rensa filter','ff-hours-btn ff-hours-clear');clear.type='button';extra.append(clear);
 panel.querySelector('.ff-hours-top')?.insertAdjacentElement('afterend',extra);
 const selected=()=>entries.filter(r=>{
  if(staff.value&&r.staff_uid!==staff.value)return false;
  if(state.value&&(state.value==='voided'?!r.is_voided:(r.is_voided||r.status!==state.value)))return false;
  if(week.value&&weekKey(r.pass_date)!==week.value)return false;
  const query=search.value.trim().toLocaleLowerCase('sv-SE');
  return !query||[r.staff_name,r.service,r.pass_date,String(r.pass_date||'').split('-').reverse().join('/')].some(x=>String(x||'').toLocaleLowerCase('sv-SE').includes(query));
 });
 const insights=mk('div',undefined,'ff-hours-insights');insights.id='ffHoursInsights';
 const weekSection=mk('section',undefined,'ff-hours-card ff-hours-summary');
 weekSection.append(mk('h3','Summering per vecka'),mk('p','Arbetad tid och pauser per kalendervecka (ISO).'));
 const weeksRoot=mk('div',undefined,'ff-hours-weeks');weeksRoot.id='ffHoursWeeks';weekSection.append(weeksRoot);
 const chartSection=mk('section',undefined,'ff-hours-card ff-hours-chart-card');
 chartSection.append(mk('h3','Arbetade timmar per medarbetare'),mk('p','Staplarna visar tiden för det valda urvalet, utan makulerade pass.'));
 const chartRoot=mk('div',undefined,'ff-hours-chart');chartRoot.id='ffHoursChart';chartRoot.setAttribute('role','img');chartRoot.setAttribute('aria-label','Diagram över arbetstimmar per medarbetare');chartSection.append(chartRoot);
 insights.append(weekSection,chartSection);
 panel.querySelector('.ff-hours-layout')?.insertAdjacentElement('beforebegin',insights);
 const excelButton=mk('button','⬇ Excel (.xlsx)','outline ff-hours-excel');excelButton.type='button';excelButton.id='ffHoursExcel';
 $('ffHoursExport')?.insertAdjacentElement('afterend',excelButton);
 function populateWeeks(){const old=week.value;week.replaceChildren();const all=mk('option','Alla veckor');all.value='';week.append(all);const weeks=[...new Set(entries.map(r=>weekKey(r.pass_date)).filter(Boolean))].sort();for(const w of weeks){const o=mk('option',w.replace('-W',' · vecka '));o.value=w;week.append(o)}week.value=weeks.includes(old)?old:''}
 const rerender=()=>redraw();
 search.addEventListener('input',rerender);state.addEventListener('change',rerender);week.addEventListener('change',rerender);
 clear.addEventListener('click',()=>{search.value='';state.value='';week.value='';staff.value='';redraw()});
 const sortedPeople=rows=>{const m=new Map();rows.forEach(r=>{const id=String(r.staff_uid||'');const x=m.get(id)||{name:String(r.staff_name||'Okänd'),sec:0,passes:0,finished:0};x.sec+=actualWork(r);x.passes++;x.finished+=r.status==='finished'?1:0;m.set(id,x)});return [...m.entries()].map(([id,v])=>({id,...v})).sort((a,b)=>b.sec-a.sec)};
 function kpi(label,value,help){const e=mk('article',undefined,'ff-hours-kpi');e.append(mk('span',label),mk('strong',value),mk('small',help));return e}
 function statusLabel(r){return r.is_voided?'Makulerad':r.status==='finished'?'Avslutad':r.status==='paused'?'Pausad':'Pågår'}
 function statusKey(r){return r.is_voided?'voided':r.status}
 function ensureMobileList(){
  let list=$('ffHoursMobileList');
  if(list)return list;
  const section=panel.querySelector('.ff-hours-layout .ff-hours-card:last-child');
  const tableWrap=section?.querySelector('.ff-hours-tablewrap');
  list=mk('div',undefined,'ff-hours-mobilelist');
  list.id='ffHoursMobileList';
  if(tableWrap)tableWrap.insertAdjacentElement('afterend',list); else section?.append(list);
  return list;
 }
 function metaCard(label,value){const box=mk('div',undefined,'ff-hours-entry-meta');box.append(mk('span',label),mk('strong',value));return box}
 function appendActionButtons(container,r){
  const wrap=mk('div',undefined,'ff-hours-actions');
  const history=mk('button','Historik','ff-hours-btn');history.type='button';history.addEventListener('click',()=>showHistory(r));wrap.append(history);
  if(r.status==='finished'&&!r.is_voided){
   const edit=mk('button','Redigera','ff-hours-btn');edit.type='button';edit.addEventListener('click',()=>editEntry(r));wrap.append(edit);
   const cancel=mk('button','Makulera','ff-hours-btn ff-hours-danger');cancel.type='button';cancel.addEventListener('click',()=>voidEntry(r));wrap.append(cancel);
  }
  container.append(wrap);
 }
 function buildMobileCard(r){
  const card=mk('article',undefined,'ff-hours-entry');
  if(r.is_voided)card.classList.add('ff-hours-voided');
  const head=mk('div',undefined,'ff-hours-entry-head');
  const left=mk('div',undefined,'ff-hours-entry-date');
  left.append(mk('strong',String(r.staff_name||'–')),mk('span',`${dateOnly(r.pass_date)} · ${String(r.service||'Uppdrag')}`));
  const pill=mk('span',statusLabel(r),'ff-hours-statuspill');pill.dataset.status=statusKey(r);
  head.append(left,pill);
  const service=mk('div',String(r.service||'Uppdrag'),'ff-hours-entry-service');
  const grid=mk('div',undefined,'ff-hours-entry-grid');
  grid.append(
   metaCard('Datum',dateOnly(r.pass_date)),
   metaCard('Tjänst',String(r.service||'Uppdrag')),
   metaCard('Start',date(r.started_at)),
   metaCard('Slut',date(r.finished_at)),
   metaCard('Arbete',dur(actualWork(r))),
   metaCard('Paus',dur(actualPause(r)))
  );
  const actions=mk('div',undefined,'ff-hours-entry-actions');
  const history=mk('button','Historik','ff-hours-btn');history.type='button';history.addEventListener('click',()=>showHistory(r));actions.append(history);
  if(r.status==='finished'&&!r.is_voided){
   const edit=mk('button','Redigera','ff-hours-btn');edit.type='button';edit.addEventListener('click',()=>editEntry(r));actions.append(edit);
   const cancel=mk('button','Makulera','ff-hours-btn ff-hours-danger');cancel.type='button';cancel.addEventListener('click',()=>voidEntry(r));actions.append(cancel);
  }
  card.append(head,service,grid,actions);
  return card;
 }
 function redraw(){
  const rows=activeEntries(), allRows=selected(), k=$('ffHoursKpis');
  k.replaceChildren();
  const seconds=rows.reduce((n,r)=>n+actualWork(r),0), pause=rows.reduce((n,r)=>n+actualPause(r),0);
  const finished=rows.filter(r=>r.status==='finished').length;
  const people=sortedPeople(rows);
  k.append(
   kpi('Arbetade timmar',dur(seconds),'Exklusive pauser'),
   kpi('Registrerade pass',fmtInt(rows.length),`${finished} avslutade`),
   kpi('Paustid',dur(pause),'Registrerade pauser'),
   kpi('Medarbetare',fmtInt(people.length),'Med registrerade pass')
  );

  const weekly=new Map();
  for(const r of rows){const key=weekKey(r.pass_date)||'Okänd vecka',x=weekly.get(key)||{seconds:0,pause:0,passes:0};x.seconds+=actualWork(r);x.pause+=actualPause(r);x.passes++;weekly.set(key,x)}
  weeksRoot.replaceChildren();
  if(!weekly.size)weeksRoot.append(mk('p','Inga arbetstider att summera.','ff-hours-empty'));
  for(const [label,value] of [...weekly].sort((a,b)=>a[0].localeCompare(b[0]))){
   const item=mk('article',undefined,'ff-hours-week');
   item.append(mk('strong',label.replace('-W',' · vecka ')),mk('span',dur(value.seconds)),mk('small',`${value.passes} pass · ${dur(value.pause)} paus`));
   weeksRoot.append(item);
  }
  chartRoot.replaceChildren();
  if(!people.length)chartRoot.append(mk('p','Inga arbetstimmar att visa.','ff-hours-empty'));
  const maxHours=Math.max(1,...people.map(p=>p.sec));
  for(const person of people){const bar=mk('div',undefined,'ff-hours-chart-row'),top=mk('div',undefined,'ff-hours-chart-labels');top.append(mk('strong',person.name),mk('span',dur(person.sec)));
   const track=mk('div',undefined,'ff-hours-chart-track'),fill=mk('div',undefined,'ff-hours-chart-fill');fill.style.width=`${Math.min(100,person.sec/maxHours*100)}%`;track.append(fill);bar.append(top,track);chartRoot.append(bar);
  }
  const root=$('ffHoursPeople');root.replaceChildren();
  const max=Math.max(1,...people.map(p=>p.sec));
  if(!people.length)root.append(mk('p','Inga rapporter för det här urvalet.','ff-hours-empty'));
  for(const p of people){
   const line=mk('div',undefined,'ff-hours-person');
   const top=mk('div',undefined,'ff-hours-person-top');
   top.append(mk('strong',p.name),mk('span',`${dur(p.sec)} · ${p.passes} pass`));
   const track=mk('div',undefined,'ff-hours-person-track'), fill=mk('div',undefined,'ff-hours-person-fill');
   fill.style.width=(p.sec/max*100)+'%';
   track.append(fill);line.append(top,track);root.append(line);
  }

  const tbody=$('ffHoursRows');
  const mobileList=ensureMobileList();
  tbody.replaceChildren();
  mobileList.replaceChildren();

  if(!allRows.length){
   const tr=mk('tr'), td=mk('td','Inga arbetspass registrerade för månaden.','ff-hours-empty');
   td.colSpan=9;tr.append(td);tbody.append(tr);
   mobileList.append(mk('p','Inga arbetspass registrerade för månaden.','ff-hours-empty'));
  }

  for(const r of allRows){
   const tr=mk('tr');
   if(r.is_voided)tr.classList.add('ff-hours-voided');
   for(const v of [dateOnly(r.pass_date),String(r.staff_name||'–'),String(r.service||'Uppdrag'),date(r.started_at),date(r.finished_at),dur(actualWork(r)),dur(actualPause(r))])tr.append(mk('td',v));
   const tdStatus=mk('td'), pill=mk('span',statusLabel(r),'ff-hours-statuspill');
   pill.dataset.status=statusKey(r);tdStatus.append(pill);tr.append(tdStatus);
   const tdActions=mk('td',undefined,'ff-hours-actions-cell');appendActionButtons(tdActions,r);tr.append(tdActions);
   tbody.append(tr);
   mobileList.append(buildMobileCard(r));
  }

  $('ffHoursExport').disabled=!rows.length;excelButton.disabled=!rows.length;
  status.textContent=`${fmtInt(rows.length)} aktiva rapporter${allRows.length>rows.length?' · '+fmtInt(allRows.length-rows.length)+' makulerade':''} · Uppdaterad ${new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})}${truncated?' · OBS! Fler än 10 000 rapporter; statistiken är ofullständig.':''}.`;
 }
 async function refresh(force=false){
  if(loading||$('dashboard').hidden)return;
  if(!force&&loadedMonth===month.value)return redraw();
  const t=token();if(!t){status.textContent='Logga in igen i adminpanelen.';return}
  loading=true;$('ffHoursRefresh').disabled=true;status.textContent='Hämtar arbetstider från Supabase…';
  try{
   const u=new URL(`${base}/functions/v1/admin-arbetstider`);u.searchParams.set('month',month.value);
   const r=await fetch(u,{headers:{Authorization:'Bearer '+t,apikey:apiKey},cache:'no-store'});
   const body=await r.json().catch(()=>({}));if(!r.ok)throw Error(body.error||`Kunde inte läsa tidrapporter (${r.status})`);
   entries=Array.isArray(body.entries)?body.entries:[];serverTime=body.server_time||new Date().toISOString();truncated=!!body.truncated;loadedMonth=month.value;
   const old=staff.value;staff.replaceChildren(mk('option','Alla medarbetare'));staff.firstChild.value='';
   const names=new Map();entries.forEach(r=>names.set(r.staff_uid,r.staff_name||'Okänd'));
   for(const [id,name] of [...names].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'sv'))){const o=mk('option',name);o.value=id;staff.append(o)}
   if([...staff.options].some(o=>o.value===old))staff.value=old;
   populateWeeks();redraw();
  }catch(e){status.textContent='Kunde inte hämta arbetstider: '+e.message}
  finally{loading=false;$('ffHoursRefresh').disabled=false}
 }
 function exportCSV(){
  const rows=activeEntries();if(!rows.length)return;
  const safe=v=>{let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
  const data=[['Datum','Medarbetare','Tjänst','Start','Slut','Arbete (minuter)','Paus (minuter)','Status'],...rows.map(r=>[dateOnly(r.pass_date),r.staff_name||'',r.service||'',date(r.started_at),date(r.finished_at),Math.round(actualWork(r)/60),Math.round(actualPause(r)/60),r.status])];
  const csv='\ufeff'+data.map(row=>row.map(safe).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}), link=document.createElement('a'), url=URL.createObjectURL(blob);
  link.href=url;link.download=`FlyttFrascht-arbetstider-${month.value}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }

 // Skapar en faktisk .xlsx-fil utan externa bibliotek, uppkoppling eller uppladdning till tredje part.
 const xmlEsc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 const colRef=index=>{let s='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
 function xlsxSheet(rows){
  let content='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
  for(let i=0;i<rows.length;i++){
   content+=`<row r="${i+1}">`;
   for(let j=0;j<rows[i].length;j++){
    const val=rows[i][j];if(val===null||val===undefined||val==='')continue;
    const ref=colRef(j)+(i+1);
    if(typeof val==='number'&&Number.isFinite(val))content+=`<c r="${ref}"><v>${val}</v></c>`;
    else content+=`<c r="${ref}" t="inlineStr"><is><t>${xmlEsc(val)}</t></is></c>`;
   }
   content+='</row>';
  }
  return content+'</sheetData></worksheet>';
 }
 const encoder=new TextEncoder();
 const crcTable=(()=>{const arr=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;arr[i]=c>>>0}return arr})();
 const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0};
 function zipStore(files){
  const parts=[],central=[];let offset=0;
  for(const [name,text] of files){const n=encoder.encode(name),d=encoder.encode(text),crc=crc32(d);
   const local=new Uint8Array(30+n.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,d.length,true);v.setUint32(22,d.length,true);v.setUint16(26,n.length,true);local.set(n,30);
   parts.push(local,d);
   const header=new Uint8Array(46+n.length),h=new DataView(header.buffer);h.setUint32(0,0x02014b50,true);h.setUint16(4,20,true);h.setUint16(6,20,true);h.setUint32(16,crc,true);h.setUint32(20,d.length,true);h.setUint32(24,d.length,true);h.setUint16(28,n.length,true);h.setUint32(42,offset,true);header.set(n,46);central.push(header);
   offset+=local.length+d.length;
  }
  const centralSize=central.reduce((n,a)=>n+a.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
  return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 }
 function exportExcel(){
  const rows=activeEntries();if(!rows.length)return;
  const details=[['Datum','Medarbetare','Tjänst','Start','Slut','Arbete (timmar)','Paus (minuter)','Status'],...rows.map(r=>[dateOnly(r.pass_date),r.staff_name||'',r.service||'',date(r.started_at),date(r.finished_at),Math.round(actualWork(r)/36)/100,Math.round(actualPause(r)/60),statusLabel(r)])];
  const w=new Map();for(const r of rows){const key=weekKey(r.pass_date)||'Okänd vecka',id=key+'|'+r.staff_uid,x=w.get(id)||{week:key,name:r.staff_name||'Okänd',seconds:0,pause:0,count:0};x.seconds+=actualWork(r);x.pause+=actualPause(r);x.count++;w.set(id,x)}
  const weekRows=[['Vecka','Medarbetare','Pass','Arbetade timmar','Paus (minuter)'],...[...w.values()].sort((a,b)=>a.week.localeCompare(b.week)||a.name.localeCompare(b.name,'sv')).map(x=>[x.week,x.name,x.count,Math.round(x.seconds/36)/100,Math.round(x.pause/60)])];
  const peopleRows=[['Medarbetare','Antal pass','Arbetade timmar'],...sortedPeople(rows).map(x=>[x.name,x.passes,Math.round(x.sec/36)/100])];
  const sheets=[['Detaljer',details],['Veckor',weekRows],['Medarbetare',peopleRows]];
  const files=[
   ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>'],
   ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
   ['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map(([n],i)=>`<sheet name="${n}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>'],
   ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+'</Relationships>'],
   ...sheets.map(([,rows],i)=>[`xl/worksheets/sheet${i+1}.xml`,xlsxSheet(rows)])
  ];
  const blob=zipStore(files),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`FlyttFrascht-lonerapport-${month.value}.xlsx`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 excelButton.addEventListener('click',exportExcel);
 // Adminåtgärder: endast klientgränssnitt; backend verifierar alltid inloggning och adminbehörighet.
 const actionURL=base+'/functions/v1/admin-arbetstider-korrigera';
 async function apiAction(method,payload){
  const t=token();if(!t)throw Error('Logga in igen i adminpanelen.');
  let url=actionURL;if(method==='GET')url+='?id='+encodeURIComponent(payload.id);
  const opts={method,headers:{Authorization:'Bearer '+t,apikey:apiKey,...(method==='POST'?{'Content-Type':'application/json'}:{})},cache:'no-store'};
  if(method==='POST')opts.body=JSON.stringify(payload);
  const response=await fetch(url,opts), body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||'Åtgärden misslyckades ('+response.status+').');
  return body;
 }
 const modal=document.createElement('dialog');modal.className='ff-hours-dialog';modal.setAttribute('aria-label','Hantera arbetstid');document.body.append(modal);
 const close=()=>{if(modal.open)modal.close();modal.replaceChildren()};
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 function makeModal(title,explain){modal.replaceChildren();const header=mk('div',undefined,'ff-hours-dialog-head');header.append(mk('h3',title));const x=mk('button','✕','ff-hours-close');x.type='button';x.setAttribute('aria-label','Stäng');x.onclick=close;header.append(x);modal.append(header,mk('p',explain,'ff-hours-dialog-info'));modal.showModal()}
 function field(form,title,type,value,required=true){const l=mk('label',title,'ff-hours-field');const i=document.createElement('input');i.type=type;i.value=value||'';i.required=required;l.append(i);form.append(l);return i}
 const locStamp=d=>{if(!d)return '';const x=new Date(d);if(Number.isNaN(x.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`};
 const actionButtons=form=>{const row=mk('div',undefined,'ff-hours-dialog-actions'), abort=mk('button','Avbryt','ff-hours-btn');abort.type='button';abort.onclick=close;row.append(abort);form.append(row);return row};
 function editEntry(r){
  makeModal('Redigera arbetstid',`Korrigering för ${r.staff_name||'medarbetare'} · ${r.pass_date}. Start och slut anges i din enhets lokala tidszon. Alla ändringar sparas i historiken.`);
  const form=document.createElement('form');form.className='ff-hours-form';form.addEventListener('submit',async e=>{e.preventDefault();
   const startDate=new Date(start.value), endDate=new Date(end.value), pauseNum=Number(pause.value);
   if(!Number.isFinite(startDate.getTime())||!Number.isFinite(endDate.getTime())||endDate<=startDate||!Number.isInteger(pauseNum)||pauseNum<0){notice.textContent='Kontrollera tiderna och pausen.';return}
   save.disabled=true;notice.textContent='Sparar korrigeringen…';
   try{await apiAction('POST',{id:r.id,action:'edit',reason:reason.value.trim(),start:startDate.toISOString(),end:endDate.toISOString(),pause_minutes:pauseNum});close();await refresh(true)}catch(error){notice.textContent=error.message;save.disabled=false}
  });
  const start=field(form,'Starttid','datetime-local',locStamp(r.started_at)), end=field(form,'Sluttid','datetime-local',locStamp(r.finished_at));
  const pause=field(form,'Paus (hela minuter)','number',String(Math.round(Number(r.pause_seconds||0)/60)));pause.min='0';pause.max='2880';pause.step='1';
  const reason=field(form,'Orsak till ändringen (minst 8 tecken)','text','');reason.minLength=8;reason.maxLength=500;reason.placeholder='Exempel: Felaktigt registrerad sluttid';
  const actions=actionButtons(form), save=mk('button','Spara korrigering','ff-hours-primary');save.type='submit';actions.append(save);const notice=mk('p','','ff-hours-action-status');notice.setAttribute('role','status');form.append(notice);modal.append(form);start.focus();
 }
 function voidEntry(r){
  makeModal('Makulera tidrapport',`Du är på väg att makulera ${r.staff_name||'medarbetare'}s rapport från ${r.pass_date}. Den försvinner ur statistik och CSV, men originalet och ändringshistoriken sparas. Rapporten kan inte startas om i Timerflytt automatiskt.`);
  const form=document.createElement('form');form.className='ff-hours-form';form.addEventListener('submit',async e=>{e.preventDefault();if(!confirm.checked)return;
   save.disabled=true;notice.textContent='Makulerar rapporten…';try{await apiAction('POST',{id:r.id,action:'void',reason:reason.value.trim()});close();await refresh(true)}catch(error){notice.textContent=error.message;save.disabled=false}});
  const reason=field(form,'Varför ska rapporten makuleras?','text','');reason.minLength=8;reason.maxLength=500;reason.placeholder='Exempel: Felaktig testregistrering';
  const line=mk('label',undefined,'ff-hours-check'), confirm=document.createElement('input');confirm.type='checkbox';confirm.required=true;line.append(confirm,mk('span','Jag förstår att rapporten inte längre räknas med.'));form.append(line);
  const actions=actionButtons(form), save=mk('button','Makulera rapport','ff-hours-danger-fill');save.type='submit';actions.append(save);const notice=mk('p','','ff-hours-action-status');notice.setAttribute('role','status');form.append(notice);modal.append(form);reason.focus();
 }
 async function showHistory(r){
  makeModal('Ändringshistorik',`Ändringar för ${r.staff_name||'medarbetare'} · ${r.pass_date}.`);
  const info=mk('p','Hämtar historiken…','ff-hours-action-status');modal.append(info);
  try{
   const body=await apiAction('GET',{id:r.id}), items=body.history||[];info.remove();
   if(!items.length){modal.append(mk('p','Inga administrativa ändringar har gjorts för rapporten.'));return}
   for(const a of items){
    const card=mk('article',undefined,'ff-hours-audit');
    card.append(mk('strong',`${a.action==='void'?'Makulerad':'Redigerad'} · ${date(a.created_at)}`),mk('p','Orsak: '+a.reason));
    const before=a.before_snapshot||{}, after=a.after_snapshot||{};
    if(a.action==='edit')card.append(mk('p',`Tid före: ${date(before.started_at)}–${date(before.finished_at)} · ${dur(before.work_seconds||0)} arbete · ${dur(before.pause_seconds||0)} paus`),mk('p',`Tid efter: ${date(after.started_at)}–${date(after.finished_at)} · ${dur(after.work_seconds||0)} arbete · ${dur(after.pause_seconds||0)} paus`));
    card.append(mk('small','Ändrad av administratör: '+String(a.actor_user_id||'').slice(0,8)+'…'));modal.append(card)
   }
  }catch(error){info.textContent=error.message}
 }
 const heading=$('ffHoursRows')?.closest('table')?.querySelector('thead tr');
 if(heading&&heading.cells.length===8)heading.append(mk('th','Åtgärder'));
 const note=panel.querySelector('.ff-hours-footnote');
 if(note)note.textContent='Administratörer kan korrigera eller makulera avslutade tidrapporter. Alla ändringar sparas i revisionshistoriken. Makulerade rapporter räknas inte i totalsummor eller CSV, men finns kvar i detaljlistan. Pågående pass ändras inte. Underlag ska granskas innan lönehantering.';
 // admin.js hanterar befintliga [data-tab]-knappar och deras active-klass.
 const observer=new MutationObserver(()=>{const active=tab.classList.contains('active')&&!$('dashboard').hidden;panel.hidden=!active;if(active)refresh()});
 observer.observe(tab,{attributes:true,attributeFilter:['class']});
 // Fotogalleriet har egen navigering, och bör också kunna dölja arbetstidsfliken.
 const photoButton=document.querySelector('[data-photo-tab]');if(photoButton)photoButton.addEventListener('click',()=>{panel.hidden=true});
 $('ffHoursRefresh').addEventListener('click',()=>refresh(true));month.addEventListener('change',()=>{loadedMonth='';refresh(true)});staff.addEventListener('change',redraw);$('ffHoursExport').addEventListener('click',exportCSV);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!panel.hidden)refresh(true)});
})();
