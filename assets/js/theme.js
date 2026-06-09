(function () {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  var meta = document.querySelector('meta[name="theme-color"]');
  btn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    if (meta) meta.setAttribute('content', next === 'dark' ? '#0a0a0b' : '#fdfdfc');
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
})();
