/* Flytt & Fräscht: förvälj tjänst när besökare kommer från en tjänstesida. */
(function () {
  'use strict';
  var names = {
    flyttfirma: 'Komplett flytt & transport',
    flyttstadning: 'Flyttstädning',
    hemstadning: 'Hemstädning',
    fonsterputs: 'Fönsterputs',
    barhjalp: 'Bärhjälp & packning'
  };
  var code = new URLSearchParams(window.location.search).get('tjanst');
  if (!code || !Object.prototype.hasOwnProperty.call(names, code)) return;

  function preselect() {
    var select = document.getElementById('s');
    if (!select) return;
    var label = names[code];
    var option = Array.prototype.find.call(select.options, function (item) {
      return item.textContent.trim() === label;
    });
    if (!option) return;
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  // Plocka med ett områdesförslag från våra lokala informationssidor.
  // Kunden kan ändra fältet; ingen exakt adress antas.
  const areaMap = { solna:'Solna', nacka:'Nacka', taby:'Täby' };
  const area = areaMap[new URLSearchParams(location.search).get('omrade') || ''];
  if (area) {
    const origin = document.getElementById('move-from');
    const address = document.getElementById('a');
    if (origin && !origin.value.trim()) { origin.value = area; origin.dispatchEvent(new Event('input', { bubbles:true })); }
    if (address && !address.value.trim()) { address.value = area; address.dispatchEvent(new Event('input', { bubbles:true })); }
  }

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preselect, { once: true });
  } else {
    preselect();
  }
})();
