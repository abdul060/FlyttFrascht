/* Flytt & Fräscht – etapp 1. Ingen data skickas eller spåras här. */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
var services=['ff-grow-move','ff-grow-clean','ff-grow-pack','ff-grow-windows','ff-grow-home'];
var datePicker=document.getElementById('ff-grow-date');if(datePicker){var now=new Date();var local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);datePicker.min=local;}
var mapping={'ff-grow-move':'multi-flytt','ff-grow-clean':'multi-flyttstad','ff-grow-pack':'multi-bar','ff-grow-windows':'multi-fonster','ff-grow-home':'multi-hemstad'};
function selected(){return services.filter(function(id){return $(id)&&$(id).checked;});}
function syncLabel(){var n=selected().length; if($('ff-grow-status'))$('ff-grow-status').textContent=n===0?'Välj minst en tjänst för att fortsätta.':n===1?'En tjänst vald. Du kan lägga till fler om du vill.':n+' tjänster valda – vi sammanställer dem i samma offertförfrågan.';}
services.forEach(function(id){if($(id))$(id).addEventListener('change',syncLabel);});
function emit(el){if(el)el.dispatchEvent(new Event('change',{bubbles:true}));}
function addToMessage(line){var field=$('g');if(!field||!line)return;var prev=field.value.trim();if(prev.indexOf(line)>=0)return;field.value=(prev?prev+'\n\n':'')+line;field.dispatchEvent(new Event('input',{bubbles:true}));}
if($('ff-grow-apply'))$('ff-grow-apply').addEventListener('click',function(){
 var ids=selected(),val=$('s');if(!ids.length){$('ff-grow-status').focus();return;}
 // Befintlig flertjänstfunktion används så att Supabase och mejlflödet förblir intakt.
 if(val){var desired=ids.length>1?'Flera tjänster':$(ids[0]).value;var option=Array.from(val.options).find(function(o){return o.value===desired||o.textContent.trim()===desired;});
  if(option){val.value=option.value;emit(val);}else if(ids.length===1&&ids[0]==='ff-grow-pack'){
    var carry=Array.from(val.options).find(function(o){return /Bärhjälp/.test(o.textContent);});if(carry){val.value=carry.value;emit(val);}
  }
 }
 if(ids.length>1){ids.forEach(function(id){var input=$(mapping[id]);if(input){input.checked=true;emit(input);}});}
 if(ids.length===1&&ids[0]==='ff-grow-pack'&&$('carry-type')){$('carry-type').value='Både bärhjälp och packhjälp';emit($('carry-type'));}
 var date=$('ff-grow-date');if(date&&date.value&&$('d')){$('d').value=date.value;emit($('d'));}
 var from=$('ff-grow-from').value.trim(),to=$('ff-grow-to').value.trim();
 if(from&&$('move-from')){$('move-from').value=from;emit($('move-from'));}
 if(to&&$('move-to')){$('move-to').value=to;emit($('move-to'));}
 if(!ids.some(function(id){return id==='ff-grow-move'||id==='ff-grow-pack';})&&(from||to)){
   addToMessage('Önskade områden: '+(from||'ej angivet')+' → '+(to||'ej angivet'));
 }
 if(ids.length>1)addToMessage('Önskat tjänstepaket: '+ids.map(function(id){return $(id).value;}).join(', '));
 var target=$('offert');if(target){target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
});
// Lokal checklista: användarens enhet, ingen datainsamling. Om lagring blockeras fungerar sidan ändå.
var checks=Array.from(document.querySelectorAll('#ff-grow-checklist input[data-step]'));
function render(){var done=checks.filter(function(c){return c.checked;}).length;var meter=$('ff-grow-meter');if(meter)meter.setAttribute('aria-valuenow',String(done));if($('ff-grow-meter-bar'))$('ff-grow-meter-bar').style.width=(100*done/Math.max(checks.length,1))+'%';if($('ff-grow-meter-label'))$('ff-grow-meter-label').textContent=done+' av '+checks.length+' klara';}
try{var raw=JSON.parse(localStorage.getItem('ff-flyttchecklista-v1')||'[]');if(Array.isArray(raw))checks.forEach(function(c){c.checked=raw.indexOf(c.dataset.step)!==-1;});}catch(e){}
checks.forEach(function(c){c.addEventListener('change',function(){render();try{localStorage.setItem('ff-flyttchecklista-v1',JSON.stringify(checks.filter(function(x){return x.checked;}).map(function(x){return x.dataset.step;})));}catch(e){}});});render();
if($('ff-grow-print'))$('ff-grow-print').addEventListener('click',function(){window.print();});
// Hjälp visas bara om besökaren aktivt arbetar i formuläret och har varit inaktiv i det 70 sekunder.
var form=$('f'),help=$('ff-grow-help'),helpTimer=null,closed=false,hasInteracted=false;
function resetHelp(){if(helpTimer)clearTimeout(helpTimer);if(help)help.hidden=true;if(!hasInteracted||closed)return;helpTimer=setTimeout(function(){if(help&&!closed&&document.visibilityState==='visible'&&form&&form.contains(document.activeElement))help.hidden=false;},70000);}
if(form){form.addEventListener('focusin',function(){hasInteracted=true;resetHelp();});form.addEventListener('input',function(){hasInteracted=true;resetHelp();});form.addEventListener('submit',function(){if(help)help.hidden=true;closed=true;},true);}
if($('ff-grow-help-close'))$('ff-grow-help-close').addEventListener('click',function(){closed=true;help.hidden=true;});
document.addEventListener('visibilitychange',function(){if(document.hidden&&help)help.hidden=true;});
})();
