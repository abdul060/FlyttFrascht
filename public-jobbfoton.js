// Publikt galleri – visar endast manuellt godkända webbkopia från Supabase.
(function(){'use strict';
const api='https://kikwvqaayclblbnvhtay.supabase.co/functions/v1/publicera-jobbfoton';
const grid=document.getElementById('ffPublicGalleryGrid');const status=document.getElementById('ffPublicGalleryStatus');const section=document.getElementById('ffPublicGallery');if(!grid||!status||!section)return;
async function run(){try{
 const response=await fetch(api,{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();
 const photos=Array.isArray(data.photos)?data.photos:[];
 if(!photos.length){section.hidden=true;return;}
 section.hidden=false;grid.replaceChildren();
 for(const p of photos){
  const card=document.createElement('figure');card.className='ff-pg-card';
  const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.src=p.url;img.alt=p.caption||'Utfört arbete av Flytt & Fräscht';
  const fig=document.createElement('figcaption');fig.textContent=p.caption||'Utfört arbete';card.append(img,fig);grid.append(card);
 }
 status.textContent=photos.length+' bilder från våra utförda uppdrag.';
 }catch{section.hidden=true;status.textContent='Galleriet kunde inte laddas.';}}
run();})();
