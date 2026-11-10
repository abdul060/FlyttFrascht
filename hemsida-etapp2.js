/* Flytt & Fräscht – etapp 2. Ingen nätverkstrafik eller extern lagring från detta skript. */
(function(){'use strict';
 var $=function(id){return document.getElementById(id);};
 var form=$('f'), service=$('s'), message=$('g');
 if(!form||!service||!message||!$('ff-e2-details'))return;
 var moving=$('ff-e2-move'),cleaning=$('ff-e2-clean'),description=$('ff-e2-context'),summary=$('ff-e2-summary');
 var fields=[['ff-e2-parking-from','Parkering vid hämtning'],['ff-e2-parking-to','Parkering vid avlämning'],['ff-e2-heavy','Tunga saker'],['ff-e2-boxes','Antal flyttkartonger'],['ff-e2-pets','Husdjur'],['ff-e2-key','Tillträde'],['ff-e2-notes','Särskilda önskemål']];
 // Svaren injiceras bara i det befintliga meddelandet så Formspree och Supabase får samma uppgifter.
 var start='[Extra planeringsuppgifter]';var end='[/Extra planeringsuppgifter]';
 function serviceType(){var multi=service.value==='Flera tjänster';return {move:service.value==='Komplett flytt & transport'||(multi&&$('multi-flytt')&&$('multi-flytt').checked),clean:service.value==='Flyttstädning'||service.value==='Hemstädning'||(multi&&(( $('multi-flyttstad')&&$('multi-flyttstad').checked)||($('multi-hemstad')&&$('multi-hemstad').checked)))||($('move-clean')&&$('move-clean').checked&&service.value==='Komplett flytt & transport')};}
 function update(){var type=serviceType();moving.hidden=!type.move;cleaning.hidden=!type.clean;description.textContent=type.move?'Berätta gärna om parkering, kartonger och större möbler. Allt är frivilligt.':type.clean?'Berätta gärna om husdjur, tillträde och särskilda behov. Allt är frivilligt.':'Beskriv gärna särskilda önskemål. Du behöver bara fylla i det du vet.';sync();}
 function detailLines(){var lines=[];fields.forEach(function(item){var el=$(item[0]);if(!el||el.value.trim()==='')return;if(moving.hidden&&moving.contains(el))return;if(cleaning.hidden&&cleaning.contains(el))return;lines.push(item[1]+': '+el.value.trim());});return lines;}
 function textWithoutBlock(text){var a=text.indexOf(start);if(a===-1)return text.trim();var b=text.indexOf(end,a);if(b===-1)return text.slice(0,a).trim();return (text.slice(0,a)+text.slice(b+end.length)).trim();}
 function sync(){var raw=textWithoutBlock(message.value),lines=detailLines();var block=lines.length?'\n\n'+start+'\n'+lines.join('\n')+'\n'+end:'';
  if(raw.length+block.length>Number(message.maxLength||1800)){summary.textContent='Planeringsuppgifterna får inte plats i meddelandet. Förkorta övrig information eller ta bort några tillägg.';return false;}
  var next=(raw+block).trim();if(message.value!==next){message.value=next;message.dispatchEvent(new Event('input',{bubbles:true}));}
  summary.textContent=lines.length?lines.length+' extra uppgift'+(lines.length===1?'':'er')+' följer med till offerten.':'Du kan lämna frågorna tomma om du vill.';return true;
 }
 service.addEventListener('change',update);['multi-flytt','multi-flyttstad','multi-hemstad','move-clean'].forEach(function(id){var el=$(id);if(el)el.addEventListener('change',update);});
 fields.forEach(function(item){var el=$(item[0]);if(el)el.addEventListener('change',sync);});
 var notes=$('ff-e2-notes');if(notes)notes.addEventListener('input',sync);
 // Kör innan det befintliga submit-handledaren och även före granskningsdialogen.
 form.addEventListener('submit',function(e){if(!sync()){e.preventDefault();e.stopImmediatePropagation();$('ff-e2-notes').focus();}},true);
 var route=$('ff-e2-route');if(route)route.addEventListener('click',function(){var a=$('move-from'),b=$('move-to'),status=$('ff-e2-route-status');var from=a&&a.value.trim(),to=b&&b.value.trim();if(!from||!to){status.textContent='Fyll först i var du flyttar från och till i offertformuläret.';(!from?a:b).focus();return;}status.textContent='';var url='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(from)+'&destination='+encodeURIComponent(to)+'&travelmode=driving';window.open(url,'_blank','noopener,noreferrer');});
 form.addEventListener('reset',function(){setTimeout(function(){update();},0);});
 update();
})();
