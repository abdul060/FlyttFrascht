(function () {
  'use strict';
  const primary = document.getElementById('d');
  const primaryOpener = document.getElementById('date-open');
  const secondary = document.getElementById('ff-alt-date');
  const secondaryOpener = document.getElementById('date-open-alt');
  const dialog = document.getElementById('date-dialog');
  if (!primary || !primaryOpener || !dialog || typeof dialog.showModal !== 'function') {
    if (primaryOpener) primaryOpener.style.display = 'none';
    if (secondaryOpener) secondaryOpener.style.display = 'none';
    if (primary) primary.style.cssText = 'position:static !important;width:100% !important;height:auto !important;opacity:1 !important;pointer-events:auto !important;clip-path:none !important;';
    return;
  }
  const grid = document.getElementById('date-grid');
  const monthLabel = document.getElementById('date-month');
  const pickedLabel = document.getElementById('date-picked-label');
  const primaryChoice = document.getElementById('date-choice');
  const secondaryChoice = document.getElementById('date-choice-alt');
  const title = document.getElementById('date-title');
  const apply = document.getElementById('date-apply');
  const monthFmt = new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' });
  const dayFmt = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
  const iso = (d) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  const parse = (s) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; const [y,m,d] = s.split('-').map(Number); const t = new Date(y,m-1,d); return t.getFullYear() === y && t.getMonth() === m-1 && t.getDate() === d ? t : null; };
  let activeInput = primary;
  let activeOpener = primaryOpener;
  let selected = primary.value || '';
  let shown = parse(selected) || new Date();
  const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

  function refreshChoice(input, label, fallback) {
    if (!label) return;
    const parsed = parse(input.value);
    label.textContent = parsed ? dayFmt.format(parsed) : fallback;
  }
  function draw() {
    monthLabel.textContent = monthFmt.format(shown);
    grid.replaceChildren();
    const year = shown.getFullYear(), month = shown.getMonth();
    const blanks = (new Date(year,month,1).getDay()+6)%7;
    for (let i=0; i<blanks; i++) { const cell = document.createElement('span'); cell.setAttribute('aria-hidden','true'); grid.appendChild(cell); }
    const total = new Date(year,month+1,0).getDate();
    const minimum = today(), minIso = iso(minimum);
    const currentMonth = new Date(minimum.getFullYear(),minimum.getMonth(),1);
    document.getElementById('date-prev').disabled = new Date(year,month,1) <= currentMonth;
    for (let d=1; d<=total; d++) {
      const day = new Date(year,month,d), val = iso(day);
      const btn = document.createElement('button'); btn.type='button'; btn.textContent=String(d);
      btn.setAttribute('aria-label',dayFmt.format(day));
      if (val < minIso) btn.disabled=true;
      if (val === selected) { btn.classList.add('is-selected'); btn.setAttribute('aria-pressed','true'); }
      if (val === minIso) btn.classList.add('is-today');
      btn.addEventListener('click',()=>{selected=val;draw();});
      grid.appendChild(btn);
    }
    const picked = parse(selected);
    pickedLabel.textContent = picked ? dayFmt.format(picked) : 'Inget datum valt';
    apply.disabled = !picked || selected < minIso;
  }
  function openFor(input, opener, alternate) {
    activeInput = input; activeOpener = opener;
    title.textContent = alternate ? 'Välj alternativt datum' : 'Välj önskat datum';
    selected = input.value || '';
    const initial = parse(selected) || today();
    shown = new Date(initial.getFullYear(),initial.getMonth(),1);
    draw(); dialog.showModal();
  }
  primaryOpener.addEventListener('click', () => openFor(primary, primaryOpener, false));
  primary.addEventListener('change', () => refreshChoice(primary, primaryChoice, 'Välj ett datum'));
  refreshChoice(primary, primaryChoice, 'Välj ett datum');
  if (secondary && secondaryOpener && secondaryChoice) {
    secondary.closest('.ff-alt-date-field')?.classList.add('ff-custom-calendar-ready');
    secondaryOpener.addEventListener('click', () => openFor(secondary, secondaryOpener, true));
    secondary.addEventListener('change', () => refreshChoice(secondary, secondaryChoice, 'Välj ett alternativt datum'));
    refreshChoice(secondary, secondaryChoice, 'Välj ett alternativt datum');
  } else if (secondaryOpener) {
    secondaryOpener.style.display = 'none';
  }
  document.getElementById('date-prev').addEventListener('click',()=>{shown=new Date(shown.getFullYear(),shown.getMonth()-1,1);draw();});
  document.getElementById('date-next').addEventListener('click',()=>{shown=new Date(shown.getFullYear(),shown.getMonth()+1,1);draw();});
  function close() { dialog.close(); activeOpener.focus(); }
  document.getElementById('date-close').addEventListener('click',close);
  document.getElementById('date-cancel').addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  apply.addEventListener('click',()=>{
    activeInput.value = selected;
    activeInput.dispatchEvent(new Event('input',{bubbles:true}));
    activeInput.dispatchEvent(new Event('change',{bubbles:true}));
    close();
  });
})();
