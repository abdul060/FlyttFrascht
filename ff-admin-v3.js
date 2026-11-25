/* Säkert fokus på ärenden. Ingen extra databasbehörighet eller lagring. */
(()=>{'use strict';
function openAdvanced(){const d=document.getElementById('ffAdvanced');if(d)d.open=true;}
function init(){
 const d=document.getElementById('ffAdvanced');if(!d)return;
 const qs=new URLSearchParams(location.search);
 if(qs.get('portal'))openAdvanced();
 const picker=document.getElementById('hittaKund');
 if(picker)picker.addEventListener('click',openAdvanced,{capture:true});
 const adminLinks=document.querySelectorAll('a[href="#hittaKund"],a[href="#adminEditorTitle"]');
 for(const a of adminLinks)a.addEventListener('click',openAdvanced);
 const s=document.getElementById('ffPriority');
 if(s&&qs.get('portal')==null)window.addEventListener('load',()=>{if(location.hash==='#hittaKund'||location.hash==='#adminEditorTitle')openAdvanced();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();