/* Flytt & Fräscht – nytt uppdrag med specifikt ärendenummer och mejlkod. */
(()=>{'use strict';
 const cfg=window.FLYTT_CONFIG||{},root=document.getElementById('portalApp');
 if(!root||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
 const section=document.createElement('section');section.className='card';section.style.cssText='margin:18px 0;padding:22px;border-left:4px solid #ff8318';
 section.innerHTML='<div class="section-kicker">NY FÖRFRÅGAN</div><h2>Koppla ett nytt uppdrag</h2><p>Har du skickat en förfrågan från hemsidan? Fyll i ärendenumret som visas efter inskickningen. Vi skickar en kod till din verifierade mejladress. Koden gäller bara det ärendet.</p><form id="ffClaimSendForm"><label for="ffClaimId">Ärendenummer från bekräftelsen</label><input id="ffClaimId" type="text" maxlength="36" required autocomplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="width:100%;max-width:420px"><button type="submit">Skicka kod för ärendet</button></form><form id="ffClaimVerifyForm" hidden><label for="ffClaimCode">Kod från mejlet (8 siffror)</label><input id="ffClaimCode" type="text" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" autocomplete="one-time-code" required><button type="submit">Bekräfta ärendet</button></form><p class="status" id="ffClaimStatus" aria-live="polite" role="status"></p>';
 root.insertBefore(section,root.querySelector('.stats-strip')||root.firstChild);
 const sendForm=section.querySelector('#ffClaimSendForm'),verifyForm=section.querySelector('#ffClaimVerifyForm'),idInput=section.querySelector('#ffClaimId'),codeInput=section.querySelector('#ffClaimCode'),status=section.querySelector('#ffClaimStatus');
 let pendingId='';
 async function call(action,code){
  const saved=JSON.parse(sessionStorage.getItem('ff_customer_password_pilot_session')||'null');
  if(!saved?.token)throw Error('Logga in på Mina sidor först.');
  const r=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/ff-bekrafta-uppdrag',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabaseAnonKey,'Authorization':'Bearer '+saved.token},body:JSON.stringify({action,request_id:pendingId,...(code?{code}:{})})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Verifieringen misslyckades.');return j;
 }
 sendForm.addEventListener('submit',async e=>{e.preventDefault();pendingId=idInput.value.trim().toLowerCase();if(!/^[0-9a-f-]{36}$/.test(pendingId)){status.textContent='Kontrollera ärendenumret.';return;}const b=sendForm.querySelector('button');b.disabled=true;status.textContent='Skickar koden…';try{await call('send');verifyForm.hidden=false;status.textContent='Kod skickad. Kontrollera mejlen för det här ärendet.';codeInput.focus();}catch(err){status.textContent=err.message;}finally{b.disabled=false;}});
 verifyForm.addEventListener('submit',async e=>{e.preventDefault();const b=verifyForm.querySelector('button');b.disabled=true;status.textContent='Verifierar koden…';try{await call('verify',codeInput.value.trim());status.textContent='Ärendet är kopplat. Uppdaterar…';location.reload();}catch(err){status.textContent=err.message;}finally{b.disabled=false;}});
})();
