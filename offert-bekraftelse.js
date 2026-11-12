/* Flytt & Fräscht – visa bekräftat ärendenummer i den befintliga tack-popupen.
   Endast UI: formulärets skickning och Supabase-sparning ändras inte. */
(function(){
  'use strict';
  function init(){
    var success=document.getElementById('res');
    var dialog=document.getElementById('ff-success-dialog');
    if(!success||!dialog||typeof dialog.showModal!=='function'||!window.MutationObserver)return;
    var x=document.getElementById('ff-success-x');
    var done=document.getElementById('ff-success-done');
    var isAlreadyShown=false;
    var steps=dialog.querySelector('.ff-success-steps');
    var panel=document.createElement('div');
    panel.id='ff-success-case-panel';
    panel.setAttribute('role','status');
    panel.setAttribute('aria-live','polite');
    panel.style.cssText='margin:20px 0;padding:18px;border:1px solid #55718f;border-radius:15px;background:#243d5a;color:#fff;line-height:1.5;';
    var heading=document.createElement('strong');
    heading.style.cssText='display:block;margin-bottom:8px;font-size:17px;';
    var description=document.createElement('p');
    description.style.cssText='margin:0 0 10px;color:#e6edf7;';
    var idRow=document.createElement('div');
    idRow.style.cssText='display:flex;gap:9px;align-items:center;flex-wrap:wrap;';
    var idText=document.createElement('code');
    idText.style.cssText='flex:1 1 220px;min-width:0;overflow-wrap:anywhere;font-size:14px;font-weight:700;color:#fff;';
    var copy=document.createElement('button');
    copy.type='button';
    copy.textContent='Kopiera nummer';
    copy.style.cssText='border:0;border-radius:10px;padding:11px 14px;background:#ff8b25;color:#0e213e;font-weight:800;cursor:pointer;';
    var feedback=document.createElement('span');
    feedback.style.cssText='font-size:13px;color:#d9ecff;';
    var portalLink=document.createElement('a');
    portalLink.href='minasidor.html';
    portalLink.textContent='Öppna Mina sidor →';
    portalLink.style.cssText='display:inline-block;margin-top:12px;color:#fff;font-weight:700;text-decoration:underline;text-underline-offset:3px;';
    idRow.appendChild(idText);idRow.appendChild(copy);
    panel.appendChild(heading);panel.appendChild(description);panel.appendChild(idRow);
    panel.appendChild(feedback);panel.appendChild(portalLink);
    if(steps)steps.parentNode.insertBefore(panel,steps);
    else dialog.querySelector('.ff-success-inner').appendChild(panel);
    var currentId='';
    copy.addEventListener('click',async function(){
      if(!currentId)return;
      try{
        if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(currentId);feedback.textContent=' Kopierat!';}
        else {var t=document.createElement('textarea');t.value=currentId;t.setAttribute('readonly','');t.style.cssText='position:fixed;left:-9999px';document.body.appendChild(t);t.select();var ok=document.execCommand('copy');t.remove();feedback.textContent=ok?' Kopierat!':' Markera numret och kopiera det.';}
      }catch(e){feedback.textContent=' Markera numret och kopiera det.';}
    });
    function updatePanel(){
      // script.js fyller #saveNote innan den visar #res.
      var note=document.getElementById('saveNote');
      var message=note?note.textContent.trim():'';
      var m=/Ärendenummer:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(message);
      currentId=m?m[1]:'';
      feedback.textContent='';
      idRow.hidden=!currentId;
      portalLink.hidden=!currentId;
      if(currentId){
        heading.textContent='Ditt ärendenummer';
        description.textContent='Spara numret. Du använder det i Mina sidor för att koppla förfrågan med en mejlkod.';
        idText.textContent=currentId;
      }else{
        heading.textContent='Information om din förfrågan';
        description.textContent=message||'Vi har tagit emot din förfrågan. Kontakta oss om du behöver hjälp att hitta ärendet.';
        idText.textContent='';
      }
    }
    function close(){if(dialog.open)dialog.close();}
    if(x)x.addEventListener('click',close);
    if(done)done.addEventListener('click',close);
    dialog.addEventListener('click',function(e){if(e.target===dialog)close();});
    new MutationObserver(function(){
      if(!success.classList.contains('on')){isAlreadyShown=false;return;}
      if(isAlreadyShown||dialog.open)return;
      isAlreadyShown=true;
      updatePanel();
      try{dialog.showModal();}catch(e){/* Inline-bekräftelsen fungerar som reserv. */}
    }).observe(success,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
