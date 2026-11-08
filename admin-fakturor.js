/* Flytt & Fräscht - Betalda fakturor. Separat adminflik, inga ändringar i admin.js */
(()=>{'use strict';
const cfg=window.FLYTT_CONFIG||{},base=String(cfg.supabaseUrl||'').replace(/\/$/,''),apiKey=cfg.supabaseAnonKey||'';
const dashboard=document.getElementById('dashboard'),nav=dashboard?.querySelector('.tabs');
if(!dashboard||!nav||!base.startsWith('https://')||!apiKey)return;
const mk=(tag,txt,cls)=>{const el=document.createElement(tag);if(txt!==undefined)el.textContent=String(txt);if(cls)el.className=cls;return el};
const money=n=>new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK'}).format(Number(n)||0);
const now=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Stockholm'});
const session=()=>{try{return JSON.parse(sessionStorage.getItem('flytt_admin_session')||'{}').token||''}catch{return ''}};
const tab=mk('button','🧾 Fakturor');tab.type='button';nav.append(tab);
const panel=mk('section',undefined,'tab-content ff-inv-panel');panel.hidden=true;dashboard.append(panel);
const title=mk('div',undefined,'ff-inv-heading');title.append(mk('div',undefined,'ff-inv-eyebrow'));
title.firstChild.textContent='FLYTT & FRÄSCHT · EKONOMI';title.append(mk('h2','Betalda fakturor'),mk('p','Skapa en tydlig PDF med vad kunden har betalat för och skicka den direkt till kundens mejl.'));panel.append(title);
const warning=mk('div','Första versionen gäller fullt betalda fakturor utan RUT-avdrag eller delbetalning. RUT-uppdrag hanteras separat så att skattereduktionen blir korrekt.','ff-inv-alert');panel.append(warning);
const root=mk('div',undefined,'ff-inv-grid');panel.append(root);
const edit=mk('section',undefined,'ff-inv-card'),archive=mk('section',undefined,'ff-inv-card');root.append(edit,archive);
edit.append(mk('h3','Ny betald faktura'),mk('p','Välj gärna en utförd bokning och kontrollera alla uppgifter före registrering.'));
const form=mk('form',undefined,'ff-inv-form');edit.append(form);
const fields={};
function field(label,key,opts={}){const cell=mk('label',undefined,'ff-inv-field'+(opts.full?' ff-inv-full':''));cell.append(mk('span',label));const x=opts.textarea?mk('textarea'):mk('input');x.name=key;x.id='ffInv_'+key;if(!opts.textarea)x.type=opts.type||'text';if(opts.required)x.required=true;if(opts.max)x.maxLength=opts.max;if(opts.min!=null)x.min=opts.min;if(opts.step!=null)x.step=opts.step;if(opts.placeholder)x.placeholder=opts.placeholder;cell.append(x);form.append(cell);fields[key]=x;return x}
const selector=mk('label',undefined,'ff-inv-field ff-inv-full');selector.append(mk('span','Hämta från utförd bokning (valfritt)'));const bookingSelect=mk('select');bookingSelect.append(mk('option','Välj utfört jobb…'));bookingSelect.firstChild.value='';selector.append(bookingSelect);form.append(selector);
const section=name=>{const h=mk('h4',name,'ff-inv-section');form.append(h)};
section('Företagets uppgifter');
field('Företagsnamn','seller_name',{required:true});field('Organisationsnummer','seller_org',{required:true,max:20});
field('Momsregistreringsnummer','seller_vat',{required:true,placeholder:'SE123456789001'});field('Företagets e-post','seller_email',{type:'email'});
field('Företagsadress','seller_address',{required:true});field('Postnummer och ort','seller_city',{required:true});
field('Telefon','seller_phone');const tax=mk('label',undefined,'ff-inv-checkbox ff-inv-full'),taxCheck=mk('input');taxCheck.type='checkbox';taxCheck.checked=false;tax.append(taxCheck,mk('span','Företaget är godkänt för F-skatt (kontrollera uppgiften)'));form.append(tax);
section('Kund och utfört jobb');
field('Kundens namn','buyer_name',{required:true});field('Kundens e-post','buyer_email',{required:true,type:'email'});
field('Kundens fakturaadress','buyer_address',{required:true});field('Kundens postnummer och ort','buyer_city',{required:true});
field('Arbetsdatum','work_date',{type:'date',required:true});field('Betalningsdatum','paid_date',{type:'date',required:true});
field('Betalsätt','payment_method',{required:true,placeholder:'Banköverföring / Swish / kort'});field('Betalningsreferens','payment_reference',{placeholder:'Valfritt referensnummer'});
section('Vad ingick i tjänsten?');
const table=mk('div',undefined,'ff-inv-items ff-inv-full');form.append(table);
const add=mk('button','+ Lägg till fakturarad','ff-inv-secondary ff-inv-full');add.type='button';form.append(add);
const totals=mk('div',undefined,'ff-inv-totals ff-inv-full');form.append(totals);
field('Totalt mottagen betalning (kr)','paid_amount',{type:'number',required:true,min:0,step:.01});
field('Övrig specifikation på fakturan','notes',{textarea:true,full:true,max:900,placeholder:'Beskriv gärna kort vad som utfördes.'});
const paid=mk('label',undefined,'ff-inv-checkbox ff-inv-full'),paidCheck=mk('input');paidCheck.type='checkbox';paidCheck.required=true;paid.append(paidCheck,mk('span','Jag bekräftar att hela beloppet har mottagits och att detta inte är en RUT-faktura eller delbetalning.'));form.append(paid);
const footer=mk('div',undefined,'ff-inv-actions ff-inv-full');const create=mk('button','Spara betald faktura','ff-inv-primary');create.type='submit';const reset=mk('button','Rensa formulär','ff-inv-secondary');reset.type='button';footer.append(create,reset);form.append(footer);
const message=mk('p','','ff-inv-notice ff-inv-full');message.setAttribute('role','status');form.append(message);
let lineElements=[];
function addLine(data={}){if(lineElements.length>=35)return;const row=mk('div',undefined,'ff-inv-item');
 const desc=mk('input');desc.placeholder='T.ex. Flyttstädning 65 m²';desc.maxLength=200;desc.required=true;desc.value=data.description||'';
 const category=mk('select');for(const [v,t] of [['arbete','Arbete'],['material','Material'],['transport','Transport'],['ovrigt','Övrigt']]){const o=mk('option',t);o.value=v;category.append(o)}category.value=data.category||'arbete';
 const qty=mk('input');qty.type='number';qty.min='0.01';qty.step='0.01';qty.required=true;qty.value=data.qty||'1';
 const price=mk('input');price.type='number';price.min='0';price.step='.01';price.required=true;price.placeholder='Pris inkl. moms';price.value=data.unit_price??'';
 const vat=mk('select');for(const r of [25,12,6,0]){const o=mk('option',r+'% moms');o.value=r;vat.append(o)}vat.value=String(data.vat_rate??25);
 const remove=mk('button','Ta bort','ff-inv-remove');remove.type='button';
 for(const [label,node] of [['Beskrivning',desc],['Typ',category],['Antal',qty],['Pris/st inkl. moms',price],['Moms',vat]]){const cell=mk('label');cell.append(mk('span',label),node);row.append(cell)}row.append(remove);table.append(row);
 const obj={row,desc,category,qty,price,vat};lineElements.push(obj);
 for(const el of [qty,price,vat])el.addEventListener('input',recalc);remove.onclick=()=>{row.remove();lineElements=lineElements.filter(x=>x!==obj);recalc()};recalc();}
function recalc(){const sums=new Map();let gross=0;for(const r of lineElements){const amount=(Number(r.qty.value)||0)*(Number(r.price.value)||0),rate=Number(r.vat.value);gross+=amount;sums.set(rate,(sums.get(rate)||0)+amount*rate/(100+rate))}totals.replaceChildren();totals.append(mk('strong','Totalpris inkl. moms: '+money(gross)));for(const [rate,n] of sums){totals.append(mk('span',`Varav moms ${rate}%: ${money(n)}`))}}
add.onclick=()=>addLine();addLine();
function invoice(){return {seller:{name:fields.seller_name.value,org:fields.seller_org.value,vat:fields.seller_vat.value,address:fields.seller_address.value,city:fields.seller_city.value,email:fields.seller_email.value,phone:fields.seller_phone.value,f_tax:taxCheck.checked},buyer:{name:fields.buyer_name.value,email:fields.buyer_email.value,address:fields.buyer_address.value,city:fields.buyer_city.value},work_date:fields.work_date.value,paid_date:fields.paid_date.value,payment_method:fields.payment_method.value,payment_reference:fields.payment_reference.value,notes:fields.notes.value,paid_amount:fields.paid_amount.value,is_paid:paidCheck.checked,is_rut:false,items:lineElements.map(r=>({description:r.desc.value,category:r.category.value,qty:Number(r.qty.value),unit_price:Number(r.price.value),vat_rate:Number(r.vat.value)}))}}
async function call(action,payload,asPdf=false){const token=session();if(!token)throw Error('Logga in igen i adminpanelen.');let url=`${base}/functions/v1/admin-fakturor`;const opts={headers:{apikey:apiKey,Authorization:'Bearer '+token},cache:'no-store'};if(payload){opts.method='POST';opts.headers['Content-Type']='application/json';opts.body=JSON.stringify({action,...payload})}else url+=`?action=${encodeURIComponent(action)}`;
 const response=await fetch(url,opts);if(asPdf){if(!response.ok){const b=await response.json().catch(()=>({}));throw Error(b.error||'Kunde inte hämta PDF.')}return response.blob()};const b=await response.json().catch(()=>({}));if(!response.ok)throw Error(b.error||`Serverfel (${response.status})`);return b}
archive.append(mk('h3','Fakturaregister'),mk('p','Sparade fakturor har unika nummer. Skickade fakturor ska inte ändras i efterhand.'));
const reload=mk('button','↻ Uppdatera fakturor','ff-inv-secondary');reload.type='button';archive.append(reload);
const listStatus=mk('p','Öppna fliken för att läsa fakturor.','ff-inv-notice');archive.append(listStatus);
const list=mk('div',undefined,'ff-inv-list');archive.append(list);
async function downloadPdf(row,button){button.disabled=true;try{const token=session();const r=await fetch(`${base}/functions/v1/admin-fakturor?action=pdf&id=${encodeURIComponent(row.id)}`,{headers:{apikey:apiKey,Authorization:'Bearer '+token},cache:'no-store'});if(!r.ok){const b=await r.json().catch(()=>({}));throw Error(b.error||`HTTP ${r.status}`)}const blob=await r.blob(),url=URL.createObjectURL(blob),anchor=mk('a');anchor.href=url;anchor.download=`FF-${row.invoice_number}.pdf`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),20000)}catch(e){listStatus.textContent='PDF-fel: '+e.message}finally{button.disabled=false}}
function renderList(rows){list.replaceChildren();if(!rows.length){list.append(mk('p','Inga fakturor skapade ännu.','ff-inv-empty'));return}for(const row of rows){const article=mk('article',undefined,'ff-inv-invoice');const h=mk('div',undefined,'ff-inv-invoice-head');h.append(mk('strong','FF-'+row.invoice_number),mk('span',row.state==='sent'?'Skickad':row.state==='sending'?'Skickar – kontrollera loggar':'Betald · Klar att skicka','ff-inv-badge'));article.append(h,mk('div',row.invoice_data?.buyer?.name+' · '+row.customer_email,'ff-inv-meta'),mk('div',`${String(row.issued_at).slice(0,10)} · ${money(row.invoice_data?.paid_amount||0)}`,'ff-inv-meta'));
 const actions=mk('div',undefined,'ff-inv-invoice-actions');const pdf=mk('button','Hämta PDF','ff-inv-secondary');pdf.type='button';pdf.onclick=()=>downloadPdf(row,pdf);actions.append(pdf);
 if(row.state==='ready'){const send=mk('button','📨 Skicka betald faktura','ff-inv-primary');send.type='button';send.onclick=async()=>{if(!window.confirm(`Skicka faktura FF-${row.invoice_number} som PDF till ${row.customer_email}? Kontrollera att uppgifterna är korrekta.`))return;send.disabled=true;listStatus.textContent='Skickar fakturan…';try{const b=await call('send',{id:row.id});listStatus.textContent='✅ Fakturan skickades till '+b.recipient;await load()}catch(e){listStatus.textContent='Utskicket misslyckades: '+e.message}finally{send.disabled=false}};actions.append(send)}
 if(row.sent_at)article.append(mk('div','Skickad: '+new Date(row.sent_at).toLocaleString('sv-SE'),'ff-inv-meta'));
 article.append(actions);list.append(article)} }
async function load(){listStatus.textContent='Hämtar fakturaregistret…';reload.disabled=true;try{const res=await call('list');renderList(res.invoices||[]);listStatus.textContent=(res.invoices||[]).length+' fakturor i registret.'}catch(e){listStatus.textContent='Kunde inte hämta fakturor: '+e.message}finally{reload.disabled=false}}
reload.onclick=load;
function rememberSeller(){const keys=['seller_name','seller_org','seller_vat','seller_email','seller_address','seller_city','seller_phone'];const value={};for(const key of keys)value[key]=fields[key].value;sessionStorage.setItem('ff-invoice-seller-draft',JSON.stringify(value));}
function restoreSeller(){try{const v=JSON.parse(sessionStorage.getItem('ff-invoice-seller-draft')||'{}');for(const [key,val] of Object.entries(v))if(fields[key])fields[key].value=String(val)}catch{}}
restoreSeller();
async function loadBookings(){try{const token=session();const r=await fetch(`${base}/rest/v1/bokningar?select=id,kundnamn,epost,adress,tjanst,datum,status&status=eq.utford&order=datum.desc&limit=150`,{headers:{apikey:apiKey,Authorization:'Bearer '+token}});if(!r.ok)return;const rows=await r.json();bookingSelect.replaceChildren();const initial=mk('option','Välj utfört jobb…');initial.value='';bookingSelect.append(initial);for(const b of rows){const option=mk('option',`${b.datum} · ${b.kundnamn} · ${b.tjanst}`);option.value=String(b.id);bookingSelect.append(option)}bookingSelect.addEventListener('change',()=>{const b=rows.find(v=>String(v.id)===bookingSelect.value);if(!b)return;fields.buyer_name.value=b.kundnamn||'';fields.buyer_email.value=b.epost||'';fields.buyer_address.value=b.adress||'';fields.work_date.value=b.datum||'';if(lineElements.length===1&&!lineElements[0].desc.value)lineElements[0].desc.value=b.tjanst||'';})}catch{/* Bokningsväljaren är frivillig */}}
form.addEventListener('submit',async e=>{e.preventDefault();const draft=invoice();const total=draft.items.reduce((n,r)=>n+Math.round(r.qty*r.unit_price*100),0)/100;
 if(Math.abs(total-Number(draft.paid_amount))>.001){message.textContent=`Betalt belopp måste motsvara fakturans totalpris (${money(total)}).`;return}
 if(!window.confirm(`Skapa en betald faktura för ${draft.buyer.name} på ${money(total)}? Ett unikt fakturanummer tilldelas och uppgifterna låses. Mejlet skickas inte förrän du klickar Skicka.`))return;
 create.disabled=true;message.textContent='Sparar fakturan…';try{rememberSeller();const result=await call('create',{invoice:draft});message.textContent=`✅ Faktura FF-${result.invoice.invoice_number} sparad. Granska PDF-filen i registret innan du skickar.`;paidCheck.checked=false;await load();archive.scrollIntoView({behavior:'smooth',block:'start'})}catch(err){message.textContent='Kunde inte spara fakturan: '+err.message}finally{create.disabled=false}});
reset.onclick=()=>{const want=window.confirm('Rensa alla kund- och fakturarader? Företagsuppgifterna behålls.');if(!want)return;rememberSeller();form.reset();restoreSeller();taxCheck.checked=false;paidCheck.checked=false;table.replaceChildren();lineElements=[];addLine();message.textContent='Formuläret rensat.'};
// En separat flik utan att störa admin.js, RUT eller fotofliken.
nav.querySelectorAll('button').forEach(b=>{if(b!==tab)b.addEventListener('click',()=>{panel.hidden=true;tab.classList.remove('active')})});
tab.addEventListener('click',()=>{if(dashboard.hidden)return;document.querySelectorAll('.tab-content').forEach(s=>s.hidden=true);nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));tab.classList.add('active');panel.hidden=false;load();loadBookings()});
})();
