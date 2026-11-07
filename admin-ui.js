/* UI only. No email or database operations are performed here. */
(()=>{
'use strict';
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function modal(){const dlg=make('dialog','ff-dialog');document.body.append(dlg);return dlg;}
function showModal(dlg){dlg.showModal();}
function closeModal(dlg){if(dlg.open)dlg.close();dlg.remove();}
window.adminConfirm=function({title='Är du säker?',message='',details=[],confirmLabel='Bekräfta',kind='send'}={}){
 return new Promise(resolve=>{
  const dlg=modal(),inner=make('div','ff-dialog-inner'),head=make('div','ff-modal-top');
  head.append(make('span','ff-modal-icon',kind==='danger'?'!':kind==='warning'?'⚠':'✉'),make('h2','ff-modal-title',title));inner.append(head);
  if(message)inner.append(make('p','ff-modal-message',message));
  if(details.length){const dl=make('dl','ff-modal-details');for(const [label,value] of details){const row=make('div','ff-modal-detail');row.append(make('dt','',String(label)),make('dd','',String(value??'–')));dl.append(row);}inner.append(dl);}
  const actions=make('div','ff-modal-actions'),cancel=make('button','ff-cancel','Avbryt'),ok=make('button',kind==='danger'?'ff-danger':kind==='warning'?'ff-warning':'',confirmLabel);
  cancel.type=ok.type='button';actions.append(cancel,ok);inner.append(actions);dlg.append(inner);
  let finished=false;function done(value){if(finished)return;finished=true;resolve(value);closeModal(dlg);}
  cancel.addEventListener('click',()=>done(false));ok.addEventListener('click',()=>done(true));dlg.addEventListener('cancel',e=>{e.preventDefault();done(false);});
  showModal(dlg);cancel.focus();
 });
};
const months=new Intl.DateTimeFormat('sv-SE',{month:'long',year:'numeric'});
const fmt=new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'long',year:'numeric'});
const localISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parse=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10))):null;
function pickDate(input){
 const current=parse(input.value),base=current||new Date();let view=new Date(base.getFullYear(),base.getMonth(),1);
 const dlg=modal(),box=make('div','ff-dialog-inner'),title=make('h2','ff-modal-title',input.id==='offerValid'?'Välj giltighetsdatum':'Välj önskat datum');
 const head=make('div','ff-picker-heading'),prev=make('button','ff-picker-nav','‹'),next=make('button','ff-picker-nav','›'),month=make('strong','ff-picker-month');prev.type=next.type='button';prev.setAttribute('aria-label','Föregående månad');next.setAttribute('aria-label','Nästa månad');head.append(prev,month,next);
 const grid=make('div','ff-picker-grid'),foot=make('div','ff-picker-foot'),today=make('button','ff-picker-cancel','Idag'),cancel=make('button','ff-picker-cancel','Avbryt');today.type=cancel.type='button';foot.append(today,cancel);box.append(title,head,grid,foot);dlg.append(box);
 function render(){month.textContent=months.format(view);grid.replaceChildren();for(const day of ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'])grid.append(make('span','ff-picker-weekday',day));const offset=(view.getDay()+6)%7;const first=new Date(view.getFullYear(),view.getMonth(),1-offset);for(let i=0;i<42;i++){const date=new Date(first.getFullYear(),first.getMonth(),first.getDate()+i),iso=localISO(date),day=make('button','ff-day'+(date.getMonth()!==view.getMonth()?' outside':'')+(iso===input.value?' is-picked':'')+(iso===localISO(new Date())?' is-today':''),String(date.getDate()));day.type='button';day.setAttribute('aria-label',fmt.format(date));day.addEventListener('click',()=>select(iso));grid.append(day);}}
 function select(value){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));window.adminRefreshDates?.();closeModal(dlg);}
 prev.addEventListener('click',()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);render();});next.addEventListener('click',()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);render();});today.addEventListener('click',()=>select(localISO(new Date())));cancel.addEventListener('click',()=>closeModal(dlg));dlg.addEventListener('cancel',e=>{e.preventDefault();closeModal(dlg);});render();showModal(dlg);prev.focus();
}
function decorateDate(input){if(!input||input.dataset.ffDate)return;input.dataset.ffDate='yes';input.classList.add('ff-date-original');input.tabIndex=-1;const button=make('button','ff-date-trigger');button.type='button';button.setAttribute('aria-label',input.id==='offerValid'?'Välj offertens giltighetsdatum':'Välj önskat datum');button.addEventListener('click',()=>pickDate(input));input.insertAdjacentElement('afterend',button);input.addEventListener('change',window.adminRefreshDates);}
window.adminRefreshDates=function(){for(const id of ['offerValid','bookingDate']){const input=document.getElementById(id);if(!input||!input.dataset.ffDate)continue;const button=input.nextElementSibling;if(!button?.classList.contains('ff-date-trigger'))continue;button.replaceChildren(make('span','',parse(input.value)?fmt.format(parse(input.value)):'Välj datum'),make('span','ff-date-calendar','▦'));}};
document.addEventListener('DOMContentLoaded',()=>{for(const id of ['offerValid','bookingDate'])decorateDate(document.getElementById(id));window.adminRefreshDates();});
})();
