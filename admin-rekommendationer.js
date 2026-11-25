/* Läsrätt till rapporten ges av Supabase-funktionen, inte av denna webbkod. */
(function(){'use strict';
 let rows=[];
 const $=id=>document.getElementById(id);
 const text=(v)=>String(v??'');
 const formatDate=s=>s?new Date(s).toLocaleDateString('sv-SE',{year:'numeric',month:'short',day:'numeric'}):'–';
 function element(tag,value,cls){const e=document.createElement(tag);if(value!==undefined)e.textContent=text(value);if(cls)e.className=cls;return e;}
 function statsBox(parent,num,caption){const d=element('div');d.append(element('strong',num),element('span',caption));parent.append(d);}
 function render(){
  const status=$('ffReferralAdminStatus'),stats=$('ffReferralAdminStats'),root=$('ffReferralAdminList');
  if(!root)return;
  root.replaceChildren();stats.replaceChildren();
  const groups=new Map();
  for(const row of rows){
   if(!groups.has(row.kod))groups.set(row.kod,{kod:row.kod,email:row.tipsare_epost,created:row.lanksdatum,refs:[]});
   if(row.forfragan_id)groups.get(row.kod).refs.push(row);
  }
  const list=[...groups.values()],count=list.reduce((sum,g)=>sum+g.refs.length,0);
  const emails=new Set(list.flatMap(g=>g.refs.map(r=>r.kundepost?.toLowerCase()).filter(Boolean)));
  statsBox(stats,list.length,'Personliga länkar');statsBox(stats,count,'Inkomna offertförfrågningar');statsBox(stats,emails.size,'Unika mejladresser');
  const q=$('ffReferralAdminSearch').value.trim().toLowerCase();
  let shown=0;
  for(const g of list){
   const hay=(g.kod+' '+g.email+' '+g.refs.map(r=>[r.kundnamn,r.kundepost,r.tjanst].join(' ')).join(' ')).toLowerCase();
   if(q&&!hay.includes(q))continue;
   shown++;
   const card=element('article',undefined,'ff-rek-entry'),header=element('header');
   header.append(element('strong',g.email||'Registrerat kundkonto'),element('span',g.kod+' · skapad '+formatDate(g.created),'ff-rek-code'));
   card.append(header,element('span',g.refs.length===1?'1 inkommande förfrågan':g.refs.length+' inkommande förfrågningar','ff-rek-count'));
   if(!g.refs.length)card.append(element('p','Ingen offertförfrågan har ännu registrerats via den här länken.','ff-rek-quiet'));
   else {const ul=element('ul');for(const r of g.refs){const li=element('li');li.append(element('b',(r.kundnamn||'Namnlös förfrågan')+' · '+(r.tjanst||'Tjänst ej angiven')),element('span',(r.kundepost||'Ingen mejladress')+' · '+formatDate(r.forfragan_datum)+' · Status: '+(r.offertstatus||'–')));ul.append(li);}card.append(ul);}
   root.append(card);
  }
  status.textContent=shown?'Visar '+shown+' av '+list.length+' personliga länkar. Ingen belöning godkänns automatiskt.':'Inga rekommendationer matchar sökningen.';
 }
 async function load(){
  const status=$('ffReferralAdminStatus');if(!status)return;
  status.textContent='Hämtar rekommendationer…';
  try{
   if(typeof window.FFAdminFetchReferrals!=='function')throw Error('Adminsessionen saknas. Logga in igen.');
   const result=await window.FFAdminFetchReferrals();
   if(!Array.isArray(result))throw Error('Ogiltigt svar från databasen.');
   rows=result;render();
  }catch(err){rows=[];$('ffReferralAdminList').replaceChildren();$('ffReferralAdminStats').replaceChildren();status.textContent='Kunde inte läsa rekommendationer. Kontrollera att database/REKOMMENDATIONER_V2_SPARNING.sql har körts i Supabase och att du är inloggad som behörig administratör. '+(err.message||'');}
 }
 window.FFLoadReferrals=load;
 $('ffRefreshReferrals')?.addEventListener('click',load);
 $('ffReferralAdminSearch')?.addEventListener('input',render);
})();
