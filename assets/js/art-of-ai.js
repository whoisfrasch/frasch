(function () {
  document.querySelectorAll('.aoa-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.closest('.aoa-group');
      if (!group) return;
      var open = group.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
})();
