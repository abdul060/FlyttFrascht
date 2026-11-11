/* Kampanjhantering – en egen adminflik, utan ändringar i admin.js. */
(function(){
'use strict';
const cfg=window.FLYTT_CONFIG||{},base=String(cfg.supabaseUrl||'').replace(/\/$/,''),key=cfg.supabaseAnonKey||'';
const nav=document.querySelector('#dashboard .tabs'),dash=document.getElementById('dashboard');
if(!nav||!dash)return;
const tab=document.createElement('button');tab.type='button';tab.textContent='🎁 Kampanjer';tab.setAttribute('aria-controls','ffCampaignPanel');nav.append(tab);
const panel=document.createElement('section');panel.className='tab-content ff-campaign-panel';panel.id='ffCampaignPanel';panel.hidden=true;
panel.innerHTML=`<div class="ff-campaign-heading"><div><h2>🎁 Kampanjer</h2><p>Skapa och ändra kampanjer som visas på hemsidan, i offerten och bland vanliga frågor. Den senast uppdaterade aktiva kampanjen visas om flera gäller samtidigt.</p></div><button type="button" id="ffCampaignRefresh" class="outline">↻ Uppdatera</button></div>
<p id="ffCampaignStatus" role="status" aria-live="polite"></p>
<div class="ff-campaign-columns"><div class="panel"><h3 id="ffCampaignFormTitle">Ny kampanj</h3><form id="ffCampaignForm">
<input type="hidden" id="ffCampaignId">
<label for="ffCampaignPercent">Rabatt i procent *</label><input type="number" id="ffCampaignPercent" min="1" max="100" step="1" value="20" required>
<label for="ffCampaignTitle">Kort text som visas på hemsidan *</label><input id="ffCampaignTitle" maxlength="140" required placeholder="På våra flytt- och städtjänster">
<label for="ffCampaignDescription">Villkor och beskrivning *</label><textarea id="ffCampaignDescription" maxlength="500" rows="4" required placeholder="Vilka tjänster omfattas och vilka villkor gäller?"></textarea>
<div class="ff-campaign-dates"><label for="ffCampaignStart">Startdatum *<input type="date" id="ffCampaignStart" required></label><label for="ffCampaignEnd">Slutdatum *<input type="date" id="ffCampaignEnd" required></label></div>
<label class="ff-campaign-check"><input type="checkbox" id="ffCampaignActive" checked> Aktiv – får visas under datumperioden</label>
<p class="minor">Kampanjen visas bara mellan start- och slutdatum enligt svensk tid. Rabatt dras inte automatiskt från kundens pris; ange den i offerten.</p>
<div class="ff-campaign-actions"><button id="ffCampaignSave" type="submit">Spara kampanj</button><button id="ffCampaignCancel" class="outline" type="button">Rensa / ny</button></div></form></div>
<div class="panel"><h3>Sparade kampanjer</h3><div id="ffCampaignList" class="ff-campaign-list"><p class="minor">Öppna fliken för att läsa kampanjerna.</p></div></div></div>`;
dash.append(panel);
const $=id=>document.getElementById(id), status=$('ffCampaignStatus');
let rows=[],busy=false;
const localToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function session(){try{return JSON.parse(sessionStorage.getItem('flytt_admin_session')||'null')}catch{return null}}
function report(s){status.textContent=s;}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function request(path,opts={}){
 const s=session();if(!s?.token)throw Error('Logga in igen – din session saknas.');
 const response=await fetch(base+'/rest/v1/'+path,{...opts,headers:{apikey:key,Authorization:'Bearer '+s.token,'Content-Type':'application/json',...(opts.headers||{})},cache:'no-store'});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.message||data.error||'Databasfel HTTP '+response.status+'. Kontrollera SQL-installationen och behörigheterna.');}
 return response.status===204?null:response.json().catch(()=>null);
}
function clear(){ $('ffCampaignForm').reset();$('ffCampaignId').value='';$('ffCampaignFormTitle').textContent='Ny kampanj';$('ffCampaignPercent').value='20';$('ffCampaignStart').value=localToday();$('ffCampaignEnd').value='2026-12-31';$('ffCampaignActive').checked=true; }
function visibleState(c){const now=localToday();return !c.active?'Inaktiv':c.starts_on>now?'Planerad':c.ends_on<now?'Avslutad':'Visas nu';}
function render(){const list=$('ffCampaignList');list.replaceChildren();if(!rows.length){const p=document.createElement('p');p.textContent='Inga kampanjer sparade.';list.append(p);return;}
 rows.forEach(c=>{
  const item=document.createElement('article');item.className='ff-campaign-item';
  const head=document.createElement('div');head.className='ff-campaign-item-header';
  const strong=document.createElement('strong');strong.textContent=c.percent+' % rabatt – '+c.title;
  const state=document.createElement('span');state.className='ff-campaign-state';state.textContent=visibleState(c);head.append(strong,state);
  const desc=document.createElement('p');desc.textContent=c.description;
  const date=document.createElement('small');date.textContent=c.starts_on+' – '+c.ends_on;
  const actions=document.createElement('div');actions.className='ff-campaign-actions';
  const edit=document.createElement('button');edit.type='button';edit.className='outline';edit.textContent='Ändra';edit.addEventListener('click',()=>editCampaign(c));
  const toggle=document.createElement('button');toggle.type='button';toggle.className='outline';toggle.textContent=c.active?'Pausa':'Aktivera';toggle.addEventListener('click',()=>setActive(c,!c.active));
  const del=document.createElement('button');del.type='button';del.className='ff-campaign-delete';del.textContent='Ta bort';del.addEventListener('click',()=>remove(c));
  actions.append(edit,toggle,del);item.append(head,desc,date,actions);list.append(item);
 });
}
async function load(){if(dash.hidden)return;report('Hämtar kampanjer…');try{const data=await request('ff_campaigns?select=*&order=updated_at.desc');rows=Array.isArray(data)?data:[];render();report('Kampanjerna är uppdaterade.');}catch(e){report('⚠️ '+e.message);}}
function editCampaign(c){$('ffCampaignId').value=c.id;$('ffCampaignPercent').value=c.percent;$('ffCampaignTitle').value=c.title;$('ffCampaignDescription').value=c.description;$('ffCampaignStart').value=c.starts_on;$('ffCampaignEnd').value=c.ends_on;$('ffCampaignActive').checked=c.active;$('ffCampaignFormTitle').textContent='Ändra kampanj';$('ffCampaignPercent').focus();}
async function write(path,method,payload){return request(path,{method,headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});}
async function save(e){e.preventDefault();if(busy)return;const start=$('ffCampaignStart').value,end=$('ffCampaignEnd').value;
 if(start>end){report('⚠️ Slutdatum måste vara samma dag eller efter startdatum.');return;}
 const id=$('ffCampaignId').value,percent=Number($('ffCampaignPercent').value);
 if(!Number.isInteger(percent)||percent<1||percent>100){report('⚠️ Ange en rabatt mellan 1 och 100 %.');return;}
 const data={percent,title:$('ffCampaignTitle').value.trim(),description:$('ffCampaignDescription').value.trim(),starts_on:start,ends_on:end,active:$('ffCampaignActive').checked};
 if(!data.title||!data.description){report('⚠️ Ange text och villkor.');return;}
 busy=true;$('ffCampaignSave').disabled=true;report('Sparar kampanjen…');
 try{const changed=await write('ff_campaigns'+(id?'?id=eq.'+encodeURIComponent(id):''),id?'PATCH':'POST',data);if(!Array.isArray(changed)||changed.length!==1)throw Error('Sparningen kunde inte bekräftas. Kontrollera behörigheterna.');clear();await load();report('✅ Kampanjen sparades. Ändringen syns när hemsidan laddas om.');}
 catch(err){report('⚠️ '+err.message)}finally{busy=false;$('ffCampaignSave').disabled=false;}
}
async function setActive(c,active){if(busy)return;busy=true;try{const changed=await write('ff_campaigns?id=eq.'+encodeURIComponent(c.id),'PATCH',{active});if(!Array.isArray(changed)||changed.length!==1)throw Error('Ändringen bekräftades inte.');await load();report('✅ Kampanjen '+(active?'aktiverad':'pausad')+'.');}catch(e){report('⚠️ '+e.message)}finally{busy=false}}
async function remove(c){if(busy)return;const ok=window.adminConfirm?await window.adminConfirm({title:'Ta bort kampanjen?',message:'Kampanjen tas bort permanent från Supabase och visas inte längre på hemsidan.',details:[['Kampanj',c.percent+' % – '+c.title]],confirmLabel:'Ja, ta bort kampanjen',kind:'danger'}):confirm('Ta bort kampanjen permanent?');if(!ok)return;
 busy=true;try{const changed=await request('ff_campaigns?id=eq.'+encodeURIComponent(c.id),{method:'DELETE',headers:{Prefer:'return=representation'}});if(!Array.isArray(changed)||changed.length!==1)throw Error('Raderingen kunde inte bekräftas.');clear();await load();report('✅ Kampanjen borttagen.');}catch(e){report('⚠️ '+e.message)}finally{busy=false;}}
function open(){if(dash.hidden){report('Logga in först.');return;}document.querySelectorAll('#dashboard .tab-content').forEach(p=>p.hidden=p!==panel);nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));tab.classList.add('active');panel.hidden=false;load();}
function hide(){panel.hidden=true;tab.classList.remove('active');}
nav.addEventListener('click',e=>{if(e.target.closest('button')!==tab)hide();});
tab.addEventListener('click',open);$('ffCampaignRefresh').addEventListener('click',load);$('ffCampaignCancel').addEventListener('click',clear);$('ffCampaignForm').addEventListener('submit',save);
$('logoutBtn')?.addEventListener('click',()=>{hide();rows=[];render();});
clear();
})();
