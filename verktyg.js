(()=>{'use strict';
const $=id=>document.getElementById(id), money=n=>Math.round(n).toLocaleString('sv-SE')+' kr';
const num=(id,min=0,max=1e9)=>{const v=Number($(id)?.value);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):min;};
// Exempelvärden, INTE företagets gällande prislista. Ändra när verkliga priser fastställts.
const PRICE={persontimmeInklMoms:425,transportStartInklMoms:1100,transportPerKmInklMoms:18};
function moveCalc(){
 const area=num('moveArea',15,350), rooms=num('moveRooms',1,5), km=num('moveKm',0,300);
 const floors=num('moveFloor',0,5), lift=$('moveElevator').checked, packing=$('movePack').checked;
 const baseHours=2.2+area/19+rooms*.35+(floors&&!lift?floors*.85:0)+(packing?Math.max(2,area/30):0);
 const hours=Math.max(4,Math.ceil(baseHours*2)/2),labor=hours*PRICE.persontimmeInklMoms;
 const transport=PRICE.transportStartInklMoms+km*PRICE.transportPerKmInklMoms;
 const total=labor+transport,lo=total*.82,hi=total*1.28;
 $('movePrice').textContent=money(lo)+' – '+money(hi);
 $('moveHours').textContent='Ca '+hours.toLocaleString('sv-SE')+' persontimmar · exempel med 2 medarbetare: '+(hours/2).toLocaleString('sv-SE')+' timmar på plats';
 $('moveLabour').textContent=money(labor);$('moveTransport').textContent=money(transport);
 $('moveRut').textContent='– '+money(labor*.5);$('moveAfterRut').textContent=money(total-labor*.5)+' (mittvärde)';
}
function quoteUrl(items,tag,extra){const p=new URLSearchParams({tjanst:items.length>1?'flera':'flyttfirma',ff_tjanster:items.join(','),ff_paket:tag,...(extra||{})});return 'index.html?'+p+'#offert';}
function rutCalc(){const labor=num('rutLabor',0,1e6),other=num('rutOther',0,1e6),discount=num('rutDiscount',0,100),room=num('rutRoom',0,75000);const before=labor+other, saved=before*discount/100, laborAfter=labor*(1-discount/100), rut=Math.min(laborAfter*.5,room),final=Math.max(0,before-saved-rut);$('rutFinal').textContent=money(final);$('rutSubtotal').textContent=money(before);$('rutSavedDiscount').textContent='− '+money(saved);$('rutSavedRut').textContent='− '+money(rut);$('rutTotal').textContent=money(final);}
const checklist=[
{weeks:8,group:'8 veckor före',name:'Bestäm flyttdatum och gör en budget',description:'Jämför kostnader, boka gärna i god tid.'},
{weeks:8,group:'8 veckor före',name:'Säg upp eller flytta avtal',description:'Kontrollera el, internet och annat som berör flytten.'},
{weeks:4,group:'4 veckor före',name:'Beställ flyttkartonger och sortera',description:'Sälj, återvinn eller skänk sådant du inte ska ta med.'},
{weeks:4,group:'4 veckor före',name:'Planera flyttstädning',description:'Kontrollera vad som behöver städas och när nycklar lämnas.'},
{weeks:3,group:'3 veckor före',name:'Gör adressändring och flyttanmälan',description:'Följ Skatteverkets och Svensk Adressändrings aktuella instruktioner.'},
{weeks:2,group:'2 veckor före',name:'Inventera stora och ömtåliga saker',description:'Fotografera gärna sådant som behöver särskild hantering.'},
{weeks:2,group:'2 veckor före',name:'Kontrollera hiss, portkod och parkering',description:'Informera flyttfirman om viktiga förutsättningar.'},
{weeks:1,group:'1 vecka före',name:'Packa och märk kartonger',description:'Skriv rum och innehåll på varje kartong.'},
{weeks:1,group:'1 vecka före',name:'Ordna en väska med det viktigaste',description:'Nycklar, mediciner och viktiga dokument ska vara lättillgängliga.'},
{weeks:0,group:'Flyttdagen',name:'Gå igenom bostaden före avfärd',description:'Kontrollera förråd, skåp och eventuella skador.'},
{weeks:0,group:'Flyttdagen',name:'Kontrollera alla nycklar och access',description:'Stäm av nyckelöverlämning och portkoder.'},
{weeks:-1,group:'Efter flytten',name:'Gör en sista kontroll',description:'Packa upp, återvinn emballage och spara dokumentation.'}
];
const checkKey='ff_private_move_check_v1'; let completed=new Set();
try{const x=JSON.parse(localStorage.getItem(checkKey)||'{}');if(x&&Array.isArray(x.done))completed=new Set(x.done.filter(Number.isInteger));if(x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||''))$('checkDate').value=x.date;}catch{}
function persistChecks(){try{localStorage.setItem(checkKey,JSON.stringify({date:$('checkDate').value,done:[...completed]}));}catch{}}
function renderChecks(){const dest=$('checkItems');dest.replaceChildren();const date=$('checkDate').value;let days=null;if(date){const target=new Date(date+'T12:00:00'),today=new Date();today.setHours(12,0,0,0);days=Math.ceil((target-today)/864e5);$('checkDays').textContent=days<0?'Flyttdatumet har passerat':days===0?'Flyttdagen är idag!':days+' dagar kvar till flytten';}else $('checkDays').textContent='Välj ett flyttdatum';let last='';checklist.forEach((item,i)=>{if(item.group!==last){last=item.group;const h=document.createElement('h3');h.className='checkgroup';h.textContent=last;dest.append(h);}const label=document.createElement('label');label.className='checkrow'+(completed.has(i)?' checked':'');const cb=document.createElement('input');cb.type='checkbox';cb.checked=completed.has(i);const copy=document.createElement('span');const b=document.createElement('strong');b.textContent=item.name;const s=document.createElement('small');s.textContent=item.description;if(days!==null&&item.weeks>=0){const due=(item.weeks*7);if(days<=due&&!completed.has(i)){s.textContent+=' · Dags att ta tag i detta.';}}copy.append(b,s);label.append(cb,copy);cb.addEventListener('change',()=>{cb.checked?completed.add(i):completed.delete(i);persistChecks();renderChecks();});dest.append(label);});const pct=Math.round(completed.size/checklist.length*100);$('checkProgress').textContent=completed.size+' av '+checklist.length+' klara';$('checkBar').setAttribute('aria-valuenow',String(pct));$('checkBar').querySelector('i').style.width=pct+'%';}
const packageMap={flyttstadning:['flytt','flyttstad'],helaflytten:['flytt','bar','flyttstad','fonster'],stadklart:['hemstad','fonster']};
function goQuote(items,name,extra){location.href=quoteUrl(items,name,extra);}
for(const id of ['moveArea','moveRooms','moveKm','moveFloor','moveElevator','movePack'])$(id).addEventListener('input',moveCalc);
for(const id of ['rutLabor','rutOther','rutDiscount','rutRoom'])$(id).addEventListener('input',rutCalc);
$('moveForm').addEventListener('submit',e=>e.preventDefault());$('rutForm').addEventListener('submit',e=>e.preventDefault());
$('moveQuote').addEventListener('click',()=>goQuote(['flytt'],'flyttkalkylator', {ff_m2:$('moveArea').value,ff_km:$('moveKm').value,ff_pack:$('movePack').checked?'1':'0'}));
$('checkDate').addEventListener('input',()=>{persistChecks();renderChecks();});$('checkPrint').addEventListener('click',()=>window.print());$('checkReset').addEventListener('click',()=>{completed.clear();persistChecks();renderChecks();});
document.querySelectorAll('[data-package]').forEach(btn=>btn.addEventListener('click',()=>goQuote(packageMap[btn.dataset.package],btn.dataset.package)));
$('packageQuote').addEventListener('click',()=>{const values=[...document.querySelectorAll('.package-choices input:checked')].map(x=>x.value);if(values.length<2){$('packageMessage').textContent='Välj minst två tjänster för att skapa ett paket.';return;}goQuote(values,'eget-paket');});
const siteLink='https://flyttfrascht.se/?utm_source=referral';
$('shareSite').addEventListener('click',async()=>{try{if(navigator.share){await navigator.share({title:'Flytt & Fräscht',text:'Här kan du få hjälp med flytt och städning i Stockholm.',url:siteLink});$('shareStatus').textContent='Delningsmenyn öppnades.';}else {await navigator.clipboard.writeText(siteLink);$('shareStatus').textContent='Länken är kopierad!';}}catch(e){if(e.name!=='AbortError')$('shareStatus').textContent='Kopiera länken via knappen nedan.';}});
$('copySite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(siteLink);$('shareStatus').textContent='Länken är kopierad!';}catch{$('shareStatus').textContent=siteLink;}});
moveCalc();rutCalc();renderChecks();
})();
