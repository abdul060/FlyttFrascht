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
var msg='';
$('f').addEventListener('submit',function(ev){
ev.preventDefault();
var n=$('n').value.trim(),p=$('p').value.trim(),e=$('e').value.trim();
var er=$('err');er.textContent='';
if(!n||!p){er.textContent='Fyll i namn och telefonnummer så att vi kan nå dig.';(!n?$('n'):$('p')).focus();return}
var rm=document.querySelector('input[name=r]:checked'),a=$('a').value.trim(),d=$('d').value,k=$('k').value.trim(),g=$('g').value.trim();
var L=['Hej Flytt & Fräscht!','','Jag vill gärna ha en offert.','','Tjänst: '+$('s').value,'Bostadens storlek: '+m.value+' m²'+(rm?', '+rm.value+' rum':'')];
if(a)L.push('Adress/område: '+a);if(d)L.push('Önskat datum: '+d);if(k)L.push('Pris jag tycker är rimligt: '+k+' kr');if(g)L.push('Meddelande: '+g);
L.push('','Namn: '+n,'Telefon: '+p);if(e)L.push('E-post: '+e);L.push('','Jag vill ha erbjudandet 20 % rabatt.');
msg=L.join('\n');
$('pre').textContent=msg;
var sub='Offertförfrågan – '+$('s').value;
$('mail').href='mailto:flyttfrascht@gmail.com?subject='+encodeURIComponent(sub)+'&body='+encodeURIComponent(msg);
$('sms').href='sms:0793596556?&body='+encodeURIComponent(msg);
var r=$('res');r.classList.add('on');r.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
});
$('cp').addEventListener('click',function(){var b=$('cp');
function ok(){b.textContent='Kopierat ✓'}
try{navigator.clipboard.writeText(msg).then(ok,function(){fb()})}catch(x){fb()}
function fb(){var t=document.createElement('textarea');t.value=msg;document.body.appendChild(t);t.select();try{document.execCommand('copy');ok()}catch(x){b.textContent='Markera texten ovan och kopiera'}t.remove()}
});
})();
