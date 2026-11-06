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
var form=$('f');
var sendBtn=$('sendBtn');
var originalButton=sendBtn.textContent;
form.addEventListener('submit',async function(ev){
 ev.preventDefault();
 var n=$('n').value.trim(),p=$('p').value.trim(),e=$('e').value.trim();
 var er=$('err');er.textContent='';$('res').classList.remove('on');
 if(!n||!p){er.textContent='Fyll i namn och telefonnummer så att vi kan nå dig.';(!n?$('n'):$('p')).focus();return;}
 if(e&&!$('e').checkValidity()){er.textContent='Skriv en giltig e-postadress eller lämna fältet tomt.';$('e').focus();return;}
 if($('website').value){return;}
 var rm=document.querySelector('input[name=r]:checked');
 var fields=new FormData();
 fields.append('Namn',n);
 fields.append('Telefon',p);
 fields.append('E-post',e||'Ej angiven');
 fields.append('Tjänst',$('s').value);
 fields.append('Bostadens storlek',m.value+' m²');
 fields.append('Antal rum',rm?rm.value:'Ej angivet');
 fields.append('Adress eller område',$('a').value.trim()||'Ej angivet');
 fields.append('Önskat datum',$('d').value||'Ej angivet');
 fields.append('Rimligt pris',$('k').value.trim()?$('k').value.trim()+' kr':'Ej angivet');
 fields.append('Meddelande',$('g').value.trim()||'Inget meddelande');
 fields.append('Erbjudande','20 % rabatt');
 fields.append('_subject','Ny offertförfrågan – '+$('s').value);
 fields.append('_gotcha',$('website').value);
 sendBtn.disabled=true;sendBtn.textContent='Skickar…';
 try{
  var response=await fetch(form.action,{method:'POST',body:fields,headers:{'Accept':'application/json'}});
  if(!response.ok){throw new Error('Formulärtjänsten svarade med status '+response.status);}
  form.reset();sl();
  $('res').classList.add('on');
  $('res').scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
 }catch(error){
  er.textContent='Det gick inte att skicka just nu. Försök igen om en stund eller mejla oss på flyttfrascht@gmail.com.';
  er.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
 }finally{sendBtn.disabled=false;sendBtn.textContent=originalButton;}
});
})();
