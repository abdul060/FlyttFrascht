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
// Visa flyttuppgifter enbart för tjänster som innefattar flytt/bärhjälp.
function isMovingService(){
 var service=$('s').value;
 return service==='Komplett flytt & transport'||service==='Bärhjälp & packning'||service==='Flera tjänster';
}
function updateMoveFields(){
 var moving=isMovingService();
 $('move-details').hidden=!moving;
 $('single-address').hidden=moving;
 $('move-from').required=moving;
 $('move-to').required=moving;
 $('a').disabled=moving;
}
$('s').addEventListener('change', updateMoveFields);
updateMoveFields();
function movementInfo(){
 if(!isMovingService())return '';
 var parts=[
 'Flyttar från: '+$('move-from').value.trim(),
 'Våning från: '+($('move-floor-from').value||'Ej angiven'),
 'Hiss från: '+($('move-lift-from').value||'Ej angivet'),
 'Flyttar till: '+$('move-to').value.trim(),
 'Våning till: '+($('move-floor-to').value||'Ej angiven'),
 'Hiss till: '+($('move-lift-to').value||'Ej angivet'),
 'Packhjälp: '+($('move-pack').checked?'Ja':'Nej'),
 'Flyttstädning: '+($('move-clean').checked?'Ja':'Nej')
 ];
 return parts.join('\n');
}
var form=$('f');
var sendBtn=$('sendBtn');
var originalButton=sendBtn.textContent;
form.addEventListener('submit',async function(ev){
 ev.preventDefault();
 var n=$('n').value.trim(),p=$('p').value.trim(),e=$('e').value.trim();
 var er=$('err');er.textContent='';$('res').classList.remove('on');
 if(!n||!p){er.textContent='Fyll i namn och telefonnummer så att vi kan nå dig.';(!n?$('n'):$('p')).focus();return;}
 if(e&&!$('e').checkValidity()){er.textContent='Skriv en giltig e-postadress eller lämna fältet tomt.';$('e').focus();return;}
 if(isMovingService() && (!$('move-from').value.trim() || !$('move-to').value.trim())){
  er.textContent='Fyll i var du flyttar från och vart du flyttar till.';
  (!$('move-from').value.trim() ? $('move-from') : $('move-to')).focus();
  return;
 }
 if($('website').value){return;}
 var rm=document.querySelector('input[name=r]:checked');
 var movingInfo=movementInfo();
 var address=isMovingService() ?
  ('Från: '+$('move-from').value.trim()+' | Till: '+$('move-to').value.trim()) : $('a').value.trim();
 var msg=($('g').value.trim()+(movingInfo?'\n\n'+movingInfo:'')).trim().slice(0,3000);
 var fields=new FormData();
 fields.append('Namn',n);
 fields.append('Telefon',p);
 fields.append('E-post',e||'Ej angiven');
 fields.append('Tjänst',$('s').value);
 fields.append('Bostadens storlek',m.value+' m²');
 fields.append('Antal rum',rm?rm.value:'Ej angivet');
 fields.append('Adress eller område',address||'Ej angivet');
 if(movingInfo)fields.append('Flyttdetaljer',movingInfo);
 fields.append('Önskat datum',$('d').value||'Ej angivet');
 fields.append('Rimligt pris',$('k').value.trim()?$('k').value.trim()+' kr':'Ej angivet');
 fields.append('Meddelande',msg||'Inget meddelande');
 fields.append('Erbjudande','20 % rabatt');
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
     storlek_kvm:Number(m.value),rum:rm?rm.value:'',adress:address,
     onskat_datum:$('d').value||null,rimligt_pris:$('k').value?Number($('k').value):null,
     meddelande:msg,status:'ny'};
    var saved=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/offertforfragningar',{
     method:'POST',headers:{'apikey':cfg.supabaseAnonKey,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(record)});
    stored=saved.ok;
   }catch(ignore){}
  }
  form.reset();sl();updateMoveFields();
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
