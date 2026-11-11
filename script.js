(function(){
var $=function(i){return document.getElementById(i)};
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
$('y').textContent=new Date().getFullYear();
var hd=document.querySelector('header');
function sc(){hd.classList.toggle('sc',window.scrollY>30)}
sc();window.addEventListener('scroll',sc,{passive:true});
var els=document.querySelectorAll('.rv');
if('IntersectionObserver' in window&&!reduce){
var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.12});
els.forEach(function(e){io.observe(e)});
}else{els.forEach(function(e){e.classList.add('in')})}
var hero=document.querySelector('.hero');
if(!reduce){hero.addEventListener('pointermove',function(e){var r=hero.getBoundingClientRect();hero.style.setProperty('--mx',(e.clientX-r.left)+'px');hero.style.setProperty('--my',(e.clientY-r.top)+'px')});
if(window.matchMedia('(hover:hover)').matches){document.querySelectorAll('.tilt').forEach(function(c){
c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform='perspective(700px) rotateX('+(-y*9)+'deg) rotateY('+(x*9)+'deg) translateY(-4px)'});
c.addEventListener('pointerleave',function(){c.style.transform=''});});}}
var m=$('m');
function sl(){$('mv').textContent=m.value;m.style.setProperty('--p',((m.value-m.min)/(m.max-m.min)*100)+'%')}
m.addEventListener('input',sl);sl();
// Dynamiska frågor. Inga extra databasfält krävs – svaren följer med i meddelandet.
var serviceNames={flytt:'Komplett flytt & transport',flyttstad:'Flyttstädning',hemstad:'Hemstädning',fonster:'Fönsterputs',bar:'Bärhjälp & packning'};
function isMulti(){return $('s').value==='Flera tjänster';}
function wants(type){return isMulti()? $('multi-'+type).checked : $('s').value===serviceNames[type];}
function isMovingService(){return wants('flytt');}
function housingRelevant(){return wants('flytt')||wants('flyttstad')||wants('hemstad');}
function chosenServices(){return Object.keys(serviceNames).filter(function(key){return $('multi-'+key).checked;}).map(function(key){return serviceNames[key];});}
function updateMoveFields(){
 var moving=isMovingService(), housing=housingRelevant(), multi=isMulti();
 $('multi-details').hidden=!multi;
 $('move-details').hidden=!moving;
 $('clean-details').hidden=!wants('flyttstad') && !(moving && $('move-clean').checked);
 $('home-details').hidden=!wants('hemstad');
 $('window-details').hidden=!wants('fonster');
 $('carry-details').hidden=!wants('bar');
 $('size-block').hidden=!housing;
 $('rooms-block').hidden=!housing;
 $('single-address').hidden=moving;
 $('move-from').required=moving;
 $('move-to').required=moving;
 $('a').disabled=moving;
 var help='Fyll i de uppgifter du känner till. Vi återkommer med ett personligt prisförslag.';
 if(multi)help='Välj minst två tjänster nedan. Frågorna anpassas efter dina val.';
 else if(wants('fonster'))help='Berätta hur många fönster du vill putsa. Du behöver inte ange bostadens storlek.';
 else if(wants('bar'))help='Beskriv vad du vill bära eller packa. Du behöver inte ange flyttadresser.';
 $('service-help').textContent=help;
}
$('s').addEventListener('change',updateMoveFields);
['flytt','flyttstad','hemstad','fonster','bar'].forEach(function(key){$('multi-'+key).addEventListener('change',updateMoveFields);});
$('move-clean').addEventListener('change',updateMoveFields);
updateMoveFields();
function serviceDetails(){
 var parts=[];
 if(isMulti())parts.push('Valda tjänster: '+chosenServices().join(', '));
 if(isMovingService())parts.push(
  'Flyttar från: '+$('move-from').value.trim(),
  'Våning från: '+($('move-floor-from').value||'Ej angiven'),
  'Hiss från: '+($('move-lift-from').value||'Ej angivet'),
  'Flyttar till: '+$('move-to').value.trim(),
  'Våning till: '+($('move-floor-to').value||'Ej angiven'),
  'Hiss till: '+($('move-lift-to').value||'Ej angivet'),
  'Packhjälp i samband med flytt: '+($('move-pack').checked?'Ja':'Nej'),
  'Flyttstädning i samband med flytt: '+($('move-clean').checked?'Ja':'Nej')
 );
 if(!$('clean-details').hidden)parts.push(
  'Flyttstädning – bostaden tömd: '+($('clean-empty').value||'Ej angivet'),
  'Flyttstädning – fönsterputs önskas: '+($('clean-windows').value||'Ej angivet')
 );
 if(wants('hemstad'))parts.push('Hemstädning – hur ofta: '+($('home-frequency').value||'Ej angivet'));
 if(wants('fonster'))parts.push(
  'Antal fönster: '+($('window-count').value||'Ej angivet'),
  'Typ av bostad/lokal: '+($('window-type').value||'Ej angivet'),
  'Fönsterputs: '+($('window-sides').value||'Ej angivet')
 );
 if(wants('bar'))parts.push(
  'Bärhjälp/packning – typ: '+($('carry-type').value||'Ej angivet'),
  'Transport behövs: '+($('carry-transport').value||'Ej angivet'),
  'Saker att bära/packa: '+($('carry-items').value.trim()||'Ej angivet')
 );
 return parts.join('\n');
}
var form=$('f');
var sendBtn=$('sendBtn');
var reviewDialog=$('quote-review-dialog');
var reviewRows=$('quote-review-rows');
var reviewConfirm=$('quote-review-confirm');
var reviewEdit=$('quote-review-edit');
var reviewClose=$('quote-review-close');
var canReview=!!(reviewDialog && reviewRows && typeof reviewDialog.showModal==='function');
var reviewApproved=false;
if(!canReview)sendBtn.textContent='Skicka offertförfrågan ✦';
var originalButton=sendBtn.textContent;
// Förhandsvisning använder textContent (aldrig HTML från kundens svar).
function addReviewRow(label,value){
 var row=document.createElement('div');row.className='quote-review-row';
 var term=document.createElement('dt');term.textContent=label;
 var desc=document.createElement('dd');desc.textContent=value || 'Ej angivet';
 row.appendChild(term);row.appendChild(desc);reviewRows.appendChild(row);
}
function reviewValue(id){return $(id).value.trim() || 'Ej angivet';}
function fillReview(){
 reviewRows.replaceChildren();
 addReviewRow('Namn',reviewValue('n'));
 addReviewRow('Telefon',reviewValue('p'));
 addReviewRow('E-post',$('e').value.trim() || 'Ej angiven');
 addReviewRow('Tjänst',isMulti() ? chosenServices().join(', ') : $('s').value);
 if(isMovingService()){
  addReviewRow('Flyttar från',reviewValue('move-from'));
  addReviewRow('Våning från',reviewValue('move-floor-from'));
  addReviewRow('Hiss från',reviewValue('move-lift-from'));
  addReviewRow('Flyttar till',reviewValue('move-to'));
  addReviewRow('Våning till',reviewValue('move-floor-to'));
  addReviewRow('Hiss till',reviewValue('move-lift-to'));
  addReviewRow('Hjälp med packning',$('move-pack').checked?'Ja':'Nej');
  addReviewRow('Flyttstädning vid flytt',$('move-clean').checked?'Ja':'Nej');
 }
 if(!$('clean-details').hidden){
  addReviewRow('Bostaden tömd',reviewValue('clean-empty'));
  addReviewRow('Fönsterputs vid flyttstädning',reviewValue('clean-windows'));
 }
 if(wants('hemstad'))addReviewRow('Hemstädning – hur ofta',reviewValue('home-frequency'));
 if(wants('fonster')){
  addReviewRow('Antal fönster',reviewValue('window-count'));
  addReviewRow('Bostad/lokal',reviewValue('window-type'));
  addReviewRow('Fönsterputsning',reviewValue('window-sides'));
 }
 if(wants('bar')){
  addReviewRow('Hjälp med',reviewValue('carry-type'));
  addReviewRow('Transport',reviewValue('carry-transport'));
  addReviewRow('Att bära/packa',reviewValue('carry-items'));
 }
 if(housingRelevant()){
  addReviewRow('Bostadens storlek',m.value+' m²');
  var room=document.querySelector('input[name=r]:checked');
  addReviewRow('Antal rum',room?room.value:'Ej angivet');
 }
 if(!isMovingService())addReviewRow('Adress/område',reviewValue('a'));
 var date=$('d').value;
 if(date){
  var match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if(match){var dateObj=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
   if(!isNaN(dateObj.getTime()))date=new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'long',year:'numeric'}).format(dateObj);}
 }
 addReviewRow('Önskat datum',date || 'Ej angivet');
 addReviewRow('Ungefärlig budget',$('k').value.trim()?$('k').value.trim()+' kr':'Ingen budget angiven');
 if($('g').value.trim())addReviewRow('Övrig information',$('g').value.trim());
}
if(canReview){
 function closeReview(){reviewDialog.close();sendBtn.focus({preventScroll:true});}
 reviewEdit.addEventListener('click',closeReview);
 reviewClose.addEventListener('click',closeReview);
 reviewDialog.addEventListener('click',function(e){if(e.target===reviewDialog)closeReview();});
 reviewConfirm.addEventListener('click',function(){
  if(sendBtn.disabled)return;
  reviewDialog.close();reviewApproved=true;
  // Samma befintliga submit-kod som tidigare, med ny validering.
  if(form.requestSubmit)form.requestSubmit(sendBtn);
  else sendBtn.click();
 });
}
form.addEventListener('submit',async function(ev){
 ev.preventDefault();
 var n=$('n').value.trim(),p=$('p').value.trim(),e=$('e').value.trim();
 var er=$('err');er.textContent='';$('res').classList.remove('on');
 if(!n||!p){er.textContent='Fyll i namn och telefonnummer så att vi kan nå dig.';(!n?$('n'):$('p')).focus();return;}
 if(e&&!$('e').checkValidity()){er.textContent='Skriv en giltig e-postadress eller lämna fältet tomt.';$('e').focus();return;}
 if(isMulti() && chosenServices().length<2){
  er.textContent='Välj minst två tjänster som du vill kombinera.';
  $('multi-flytt').focus();return;
 }
 if(wants('fonster') && $('window-count').value && !$('window-count').checkValidity()){
  er.textContent='Ange ett rimligt antal fönster eller lämna fältet tomt.';
  $('window-count').focus();return;
 }
 if(isMovingService() && (!$('move-from').value.trim() || !$('move-to').value.trim())){
  er.textContent='Fyll i var du flyttar från och vart du flyttar till.';
  (!$('move-from').value.trim() ? $('move-from') : $('move-to')).focus();
  return;
 }
 if($('website').value){return;}
 // Första trycket visar granskning. Endast bekräftelse kan skicka formuläret.
 if(canReview && !reviewApproved){
  fillReview();reviewDialog.showModal();reviewDialog.scrollTop=0;$('quote-review-title').focus({preventScroll:true});return;
 }
 reviewApproved=false;
 var rm=document.querySelector('input[name=r]:checked');
 var extraInfo=serviceDetails();
 var housing=housingRelevant();
 var address=isMovingService() ?
  ('Från: '+$('move-from').value.trim()+' | Till: '+$('move-to').value.trim()) : $('a').value.trim();
 // Enkel kampanjhänvisning utan cookies, tredjepartsspårning eller kund-ID.
 var allowedSources={facebook:'Facebook',instagram:'Instagram',tiktok:'TikTok',qr:'QR-affisch',flyer:'Tryckt affisch',partner:'Samarbetspartner'};
 var sourceKey=new URLSearchParams(location.search).get('utm_source')||'';
 var sourceLabel=allowedSources[sourceKey.toLowerCase()]||'';
 var msg=($('g').value.trim()+(extraInfo?'\n\n'+extraInfo:'')).trim();
 if(sourceLabel)msg+=(msg?'\n\n':'')+'Inkom via: '+sourceLabel;
 msg=msg.slice(0,3000);
 var fields=new FormData();
 fields.append('Namn',n);
 fields.append('Telefon',p);
 fields.append('E-post',e||'Ej angiven');
 fields.append('Tjänst',$('s').value);
 fields.append('Bostadens storlek',housing?m.value+' m²':'Ej relevant för denna tjänst');
 fields.append('Antal rum',housing?(rm?rm.value:'Ej angivet'):'Ej relevant');
 fields.append('Adress eller område',address||'Ej angivet');
 if(extraInfo)fields.append('Uppdragsdetaljer',extraInfo);
 fields.append('Önskat datum',$('d').value||'Ej angivet');
 fields.append('Rimligt pris',$('k').value.trim()?$('k').value.trim()+' kr':'Ej angivet');
 fields.append('Meddelande',msg||'Inget meddelande');
 fields.append('_subject','Ny offertförfrågan – '+$('s').value);
 fields.append('_gotcha',$('website').value);
 sendBtn.disabled=true;sendBtn.textContent='Skickar…';
 try{
  var response=await fetch(form.action,{method:'POST',body:fields,headers:{'Accept':'application/json'}});
  if(!response.ok){throw new Error('Formulärtjänsten svarade med status '+response.status);}
  // Formspree har bekräftat att mejlförfrågan togs emot.
  // Spara separat i Supabase för adminpanelen. Historiska Formspree-svar importeras inte.
  var stored=false;
  var cfg=window.FLYTT_CONFIG||{};
  if(cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('DITT-PROJEKT')){
   try {
    var record={namn:n,telefon:p,epost:e||null,tjanst:$('s').value,
     storlek_kvm:housing?Number(m.value):0,rum:housing?(rm?rm.value:''):'Ej relevant',adress:address,
     onskat_datum:$('d').value||null,rimligt_pris:$('k').value?Number($('k').value):null,
     meddelande:msg,status:'ny'};
    var saved=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/offertforfragningar',{
     method:'POST',headers:{'apikey':cfg.supabaseAnonKey,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(record)});
    stored=saved.ok;
   }catch(ignore){}
  }
  form.reset();sl();updateMoveFields();
  $('d').dispatchEvent(new Event('change',{bubbles:true}));
  var note=$('saveNote');
  if(note) note.textContent=stored?'':'Din förfrågan har skickats till vår mejl, men kunde inte sparas i vårt interna offertsystem. Vi har ändå fått din förfrågan.';
  $('res').classList.add('on');
  $('res').scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
 }catch(error){
  er.textContent='Det gick inte att skicka just nu. Försök igen om en stund eller mejla oss på flyttfrascht@gmail.com.';
  er.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
 }finally{sendBtn.disabled=false;sendBtn.textContent=originalButton;}
});
})();
