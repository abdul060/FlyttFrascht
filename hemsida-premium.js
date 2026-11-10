/* Flytt & Fräscht: hjälp kunden beskriva uppdragets omfattning utan påhittade prisuppgifter. */
(function(){
  'use strict';
  const service=document.getElementById('guide-service');
  const size=document.getElementById('guide-size');
  const rooms=document.getElementById('guide-rooms');
  const access=document.getElementById('ff-guide-access');
  const extra=document.getElementById('ff-guide-extra');
  const scope=document.getElementById('ff-guide-scope');
  const result=document.getElementById('ff-guide-result');
  const next=document.getElementById('guide-cta');
  if(!service||!size||!rooms||!access||!extra||!scope||!result||!next)return;
  const accessLabels={normal:'enkel åtkomst eller hiss',stairs:'trappor eller längre bärväg',unknown:'åtkomst behöver kontrolleras'};
  const extraLabels={none:'inga extra tjänster',packing:'packhjälp',cleaning:'flyttstädning',windows:'fönsterputs',discuss:'extra tjänster att diskutera'};
  function update(){
    const area=Number(size.value)||60;
    const extent=area<=45?'Mindre':area<=100?'Mellanstort':'Större';
    scope.textContent=extent+' uppdrag';
    result.textContent=service.value+' för cirka '+area+' m² ('+rooms.value+' rum), med '+accessLabels[access.value]+'. Tillval: '+extraLabels[extra.value]+'. Vi tar fram ett personligt pris utifrån dina uppgifter.';
  }
  [service,size,rooms,access,extra].forEach(el=>el.addEventListener('change',update));
  size.addEventListener('input',update);
  update();
  // Den gamla site-extras.js fyller redan i tjänst/storlek/rum i offertformuläret.
  // Vi kompletterar bara med valfri information, utan att röra dess affärslogik.
  next.addEventListener('click',()=>{
    const notes=document.getElementById('g');
    if(!notes)return;
    const context='Prisguide: '+accessLabels[access.value]+', '+extraLabels[extra.value]+'.';
    const previous=notes.value.replace(/(?:\n)?Prisguide: [^\n]*/g,'').trim();
    notes.value=(previous?previous+'\n':'')+context;
    notes.dispatchEvent(new Event('input',{bubbles:true}));
  });
})();
