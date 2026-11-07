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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preselect, { once: true });
  } else {
    preselect();
  }
})();
