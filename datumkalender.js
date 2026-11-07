(function () {
  'use strict';
  const input = document.getElementById('d');
  const opener = document.getElementById('date-open');
  const dialog = document.getElementById('date-dialog');
  if (!input || !opener || !dialog || typeof dialog.showModal !== 'function') {
    if (opener) opener.style.display = 'none';
    if (input) input.style.cssText = 'position:static !important;width:100% !important;height:auto !important;opacity:1 !important;pointer-events:auto !important;clip-path:none !important;';
    return;
  }
  const grid = document.getElementById('date-grid');
  const monthLabel = document.getElementById('date-month');
  const pickedLabel = document.getElementById('date-picked-label');
  const choiceLabel = document.getElementById('date-choice');
  const apply = document.getElementById('date-apply');
  const monthFmt = new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' });
  const dayFmt = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
  const iso = (d) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  const parse = (s) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; const [y,m,d] = s.split('-').map(Number); const t = new Date(y,m-1,d); return t.getFullYear() === y && t.getMonth() === m-1 && t.getDate() === d ? t : null; };
  let selected = input.value || '';
  let shown = parse(selected) || new Date();
  const today = () => { const d=new Date();d.setHours(0,0,0,0);return d; };
  function refreshChoice() { const d=parse(input.value);choiceLabel.textContent=d ? dayFmt.format(d) : 'Välj ett datum'; }
  function draw() {
    monthLabel.textContent = monthFmt.format(shown);
    grid.replaceChildren();
    const year=shown.getFullYear(), month=shown.getMonth();
    const blanks=(new Date(year,month,1).getDay()+6)%7;
    for(let i=0;i<blanks;i++){ const cell=document.createElement('span');cell.setAttribute('aria-hidden','true');grid.appendChild(cell); }
    const total=new Date(year,month+1,0).getDate();
    const minimum=today(), minIso=iso(minimum);
    const currentMonth=new Date(minimum.getFullYear(),minimum.getMonth(),1);
    document.getElementById('date-prev').disabled = new Date(year,month,1) <= currentMonth;
    for(let d=1;d<=total;d++){
      const day=new Date(year,month,d), val=iso(day);
      const btn=document.createElement('button');btn.type='button';btn.textContent=String(d);
      btn.setAttribute('aria-label',dayFmt.format(day));
      if (val < minIso) btn.disabled=true;
      if (val===selected){ btn.classList.add('is-selected');btn.setAttribute('aria-pressed','true'); }
      if (val===minIso)btn.classList.add('is-today');
      btn.addEventListener('click',()=>{selected=val;draw();});
      grid.appendChild(btn);
    }
    const picked=parse(selected);
    pickedLabel.textContent=picked ? dayFmt.format(picked) : 'Inget datum valt';
    apply.disabled = !picked || selected < minIso;
  }
  opener.addEventListener('click',()=>{
    selected=input.value || '';
    const initial=parse(selected) || today();
    shown=new Date(initial.getFullYear(),initial.getMonth(),1);
    draw(); dialog.showModal();
  });
  document.getElementById('date-prev').addEventListener('click',()=>{shown=new Date(shown.getFullYear(),shown.getMonth()-1,1);draw();});
  document.getElementById('date-next').addEventListener('click',()=>{shown=new Date(shown.getFullYear(),shown.getMonth()+1,1);draw();});
  function close(){dialog.close();opener.focus();}
  document.getElementById('date-close').addEventListener('click',close);
  document.getElementById('date-cancel').addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  apply.addEventListener('click',()=>{
    input.value=selected;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    refreshChoice();close();
  });
  input.addEventListener('change',refreshChoice);
  refreshChoice();
})();
