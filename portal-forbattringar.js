/* Flytt & Fräscht v5. Fristående UI: befintliga Supabase-anrop och formulär påverkas inte. */
(function(){'use strict';
const $=id=>document.getElementById(id);
function setupCustomer(){
 const checklist=$('checklist'),bar=$('checkProgressBar'),label=$('checkProgressLabel');
 if(checklist&&bar&&label){const update=()=>{const items=[...checklist.querySelectorAll('input[type="checkbox"]')];const done=items.filter(x=>x.checked).length;label.textContent=done+' av '+items.length+' klara';bar.style.width=(items.length?100*done/items.length:0)+'%';};const observer=new MutationObserver(update);observer.observe(checklist,{childList:true,subtree:true});checklist.addEventListener('change',update);update();}
 const input=$('photos'),drop=$('photoDropzone'),selection=$('photoSelection');
 if(input&&drop&&selection){const update=()=>{const files=[...input.files];selection.textContent=files.length?files.length+' valda: '+files.map(f=>f.name).join(', '):'Inga bilder valda ännu';};input.addEventListener('change',update);const form=$('photoForm');form?.addEventListener('reset',()=>setTimeout(update,0));['dragenter','dragover'].forEach(event=>drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('dragging');}));['dragleave','drop'].forEach(event=>drop.addEventListener(event,e=>{e.preventDefault();drop.classList.remove('dragging');}));drop.addEventListener('drop',e=>{if(!e.dataTransfer?.files?.length)return;try{input.files=e.dataTransfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}catch{selection.textContent='Använd knappen Välj bilder för att lägga till filer.';}});update();}
}
function setupAdmin(){const root=$('portalSearchResults'),service=$('portalServiceFilter'),status=$('portalStatusFilter'),count=$('portalShownCount'),grid=$('portalGridView'),list=$('portalListView');if(!root||!service||!status)return;
 let busy=false;
 function details(btn){const name=btn.querySelector('.result-info strong')?.textContent||'';const small=btn.querySelector('.result-info small')?.textContent||'';const state=btn.querySelector('.result-state')?.textContent||'';return {name,small,state,service:small.split(' · ').slice(1).join(' · ').trim()};}
 function update(){if(busy)return;busy=true;try{const buttons=[...root.querySelectorAll('.portal-result')];const unique=(values)=>[...new Set(values.map(v=>v.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'sv'));const info=buttons.map(details);const oldService=service.value,oldStatus=status.value;
 function fill(select,values,current){select.replaceChildren();const opt=document.createElement('option');opt.value='';opt.textContent=select===service?'Alla tjänster':'Alla statusar';select.append(opt);for(const value of unique(values)){const o=document.createElement('option');o.value=value;o.textContent=value;select.append(o);}select.value=[...select.options].some(o=>o.value===current)?current:'';}
 fill(service,info.map(x=>x.service),oldService);fill(status,info.map(x=>x.state),oldStatus);
 let shown=0;buttons.forEach((btn,i)=>{const entry=info[i];const visible=(!service.value||entry.service===service.value)&&(!status.value||entry.state===status.value);btn.hidden=!visible;if(visible)shown++;const pill=btn.querySelector('.result-state');if(pill){const s=entry.state.toLocaleLowerCase('sv');pill.dataset.status=s.includes('utförd')?'utford':s.includes('avslutad')?'avslutad':s.includes('offert')?'offert':'annan';}});count.textContent=shown+' kundportaler';
 }finally{busy=false;}}
 // Base script clears and rebuilds results after searching or refreshing.
 const observer=new MutationObserver(()=>update());observer.observe(root,{childList:true,subtree:true,characterData:true});service.addEventListener('change',update);status.addEventListener('change',update);
 function setView(mode){root.classList.toggle('list-view',mode==='list');grid.classList.toggle('is-current',mode==='grid');list.classList.toggle('is-current',mode==='list');grid.setAttribute('aria-pressed',String(mode==='grid'));list.setAttribute('aria-pressed',String(mode==='list'));}
 grid?.addEventListener('click',()=>setView('grid'));list?.addEventListener('click',()=>setView('list'));update();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setupCustomer();setupAdmin();});else{setupCustomer();setupAdmin();}
})();
