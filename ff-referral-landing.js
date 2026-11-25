/* Sparar endast koden under besökarens pågående fliksession (ingen tredje part). */
(function(){'use strict';
 const pattern=/^FF-[A-F0-9]{12}$/;
 let code='';
 try {
  const u=new URLSearchParams(location.search).get('ff_ref');
  if(u && pattern.test(u.toUpperCase())){
   code=u.toUpperCase();sessionStorage.setItem('ff_referral_active_code',code);
  }else{
   const saved=sessionStorage.getItem('ff_referral_active_code')||'';
   if(pattern.test(saved))code=saved;
  }
 }catch(e){const u=new URLSearchParams(location.search).get('ff_ref')||'';if(pattern.test(u.toUpperCase()))code=u.toUpperCase();}
 window.FFReferral={getCode:()=>code};
})();
