/* Offentliga kampanjer: använder bara publicerbara rader från Supabase RLS. */
(function () {
  'use strict';
  const config = window.FLYTT_CONFIG || {};
  const url = String(config.supabaseUrl || '').replace(/\/$/, '');
  const key = config.supabaseAnonKey || '';
  const hero = document.querySelector('.ff-discount-hero');
  const form = document.querySelector('.ff-discount-form');
  const faq = document.querySelector('.faq-list [data-ff-discount-2026]');
  if (!hero || !form || !faq) return;
  const today = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Stockholm', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const prettyDate = date => new Intl.DateTimeFormat('sv-SE', {day:'numeric', month:'long', year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  function hide() { [hero, form, faq].forEach(x=>x.hidden=true); }
  function show(c) {
    const percent = Number(c.percent);
    if (!Number.isInteger(percent) || percent<1 || percent>100 || !/^\d{4}-\d{2}-\d{2}$/.test(c.ends_on)) return hide();
    const tag = hero.querySelector('.ff-discount-percent');
    const desc = hero.querySelector('.ff-discount-hero-text');
    tag.textContent = percent + ' % RABATT';
    desc.textContent = (c.title || 'På våra flytt- och städtjänster') + ' · Gäller t.o.m. ' + prettyDate(c.ends_on);
    form.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = percent + ' % kampanjrabatt';
    form.append(strong, document.createTextNode(' – ' + (c.description || c.title || 'På våra flytt- och städtjänster') + '. Gäller för offertförfrågningar senast ' + prettyDate(c.ends_on) + '. Rabatten specificeras i vårt personliga prisförslag.'));
    faq.querySelector('summary').textContent = 'Hur fungerar vår ' + percent + ' % rabatt?';
    faq.querySelector('p').textContent = (c.description || c.title || 'Kampanjen gäller våra utvalda tjänster') + '. Gäller offertförfrågningar senast ' + prettyDate(c.ends_on) + '. Vi redovisar rabatten i ditt personliga prisförslag. Eventuellt RUT-avdrag bedöms separat enligt gällande villkor.';
    [hero,form,faq].forEach(x=>x.hidden=false);
  }
  // Befintlig 20 %-kampanj fortsätter visas om databastabellen inte satts upp ännu.
  // Vid lyckat svar från databasen är DEN datan alltid avgörande, även en tom lista.
  function fallback() {if(today<='2026-12-31') [hero,form,faq].forEach(x=>x.hidden=false);else hide();}
  hide();
  if (!url.startsWith('https://') || !key) return fallback();
  fetch(url+'/rest/v1/ff_campaigns?select=id,percent,title,description,starts_on,ends_on&active=eq.true&starts_on=lte.'+today+'&ends_on=gte.'+today+'&order=updated_at.desc&limit=1',{
    headers:{apikey:key},cache:'no-store'
  }).then(async response=>{
    if(!response.ok) throw Error('Kampanjer gick inte att läsa');
    const rows = await response.json();
    if(Array.isArray(rows)&&rows.length) show(rows[0]); else hide();
  }).catch(fallback);
})();
