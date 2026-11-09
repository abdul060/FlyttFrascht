/* Read-only summary: booking data reused from admin.js, invoices read from existing Edge Function. */
(()=>{'use strict';
const $=id=>document.getElementById(id),cfg=window.FLYTT_CONFIG||{};
const base=String(cfg.supabaseUrl||'').replace(/\/$/,''),key=cfg.supabaseAnonKey||'';
const currency=n=>new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK'}).format(n);
const localDay=date=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
let previousFetch=0,busy=false,latestBooks=[];
const status=$('ffPlusInvoiceStatus');if(!status)return;
function invoicesTab(){const b=[...document.querySelectorAll('#dashboard .tabs button')].find(x=>x.textContent.includes('Fakturor'));if(b)b.click();else status.textContent='Hittade inte fakturafliken. Uppdatera sidan.';}
$('ffPlusInvoicesOpen').addEventListener('click',invoicesTab);
$('ffPlusCalendar').addEventListener('click',()=>document.querySelector('[data-tab="bookings"]')?.click());
function drawBooks(){const target=$('ffPlusRecent');target.replaceChildren();
 const today=localDay(new Date()),cutoff=localDay(new Date(Date.now()-30*86400000));
 const done=latestBooks.filter(b=>b.status==='utford'&&b.datum>=cutoff&&b.datum<=today).sort((a,b)=>String(b.datum).localeCompare(String(a.datum)));
 $('ffPlusCompleted').textContent=String(done.length);
 if(!done.length){const p=document.createElement('p');p.className='ff-overview-empty';p.textContent='Inga utförda kalenderjobb de senaste 30 dagarna.';target.append(p);return;}
 for(const b of done.slice(0,4)){const entry=document.createElement('div');entry.className='ff-overview-entry';const strong=document.createElement('strong'),desc=document.createElement('span');strong.textContent=b.kundnamn||'Kund';desc.className='ff-overview-desc';desc.textContent=(b.datum||'')+' · '+(b.tjanst||'Utfört uppdrag');entry.append(strong,desc);target.append(entry)}
 if(done.length>4){const p=document.createElement('p');p.className='ff-overview-more';p.textContent='+'+(done.length-4)+' ytterligare utförda jobb';target.append(p)}
}
async function loadInvoices(force=false){
 if($('dashboard')?.hidden||$('overviewPanel')?.hidden||busy)return;
 if(!force&&Date.now()-previousFetch<60000)return;
 let token='';try{token=JSON.parse(sessionStorage.getItem('flytt_admin_session')||'{}').token||''}catch{}
 if(!token||!base.startsWith('https://')||!key){status.textContent='Logga in för att se fakturorna.';return;}
 busy=true;status.textContent='Hämtar betalda fakturor…';
 try{const r=await fetch(base+'/functions/v1/admin-fakturor?action=list',{headers:{apikey:key,Authorization:'Bearer '+token},cache:'no-store'});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'HTTP '+r.status);
 const rows=Array.isArray(data.invoices)?data.invoices:[];
 const total=rows.reduce((sum,i)=>sum+(Number(i.invoice_data?.paid_amount)||0),0);
 const unsent=rows.filter(i=>i.state==='ready').length;
 $('ffPlusInvoices').textContent=String(rows.length);$('ffPlusRevenue').textContent=currency(total);$('ffPlusUnsent').textContent=String(unsent);
 status.textContent=rows.length+' betalda fakturor registrerade, varav '+unsent+' klara att mejlas.';previousFetch=Date.now();
 }catch(e){status.textContent='Kunde inte hämta fakturor: '+(e?.message||'Okänt fel');for(const id of ['ffPlusInvoices','ffPlusRevenue','ffPlusUnsent'])$(id).textContent='–';}
 finally{busy=false;}
}
window.addEventListener('ff:overview-updated',e=>{latestBooks=Array.isArray(e.detail?.bookings)?e.detail.bookings:[];drawBooks();loadInvoices();});
$('ffOverviewRefresh')?.addEventListener('click',()=>{previousFetch=0;setTimeout(()=>loadInvoices(true),250)});
document.querySelector('[data-tab="overview"]')?.addEventListener('click',()=>setTimeout(()=>loadInvoices(),100));
})();
