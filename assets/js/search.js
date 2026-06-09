(function () {
  var dialog = document.getElementById('search-dialog');
  var openBtn = document.getElementById('search-open');
  var input = document.getElementById('search-input');
  var list = document.getElementById('search-results');
  if (!dialog || !openBtn || !input || !list || typeof dialog.showModal !== 'function') return;

  var kbd = document.getElementById('search-kbd');
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  if (kbd && !isMac) kbd.textContent = 'ctrl k';

  var index = null;
  var selected = 0;

  function loadIndex() {
    if (index) return Promise.resolve(index);
    return fetch(dialog.getAttribute('data-index'))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        data.forEach(function (d) {
          d._title = (d.title || '').toLowerCase();
          d._desc = (d.description || '').toLowerCase();
          d._content = (d.content || '').toLowerCase();
          d._tags = (d.tags || []).join(' ').toLowerCase();
        });
        index = data;
        return index;
      });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, terms) {
    var safe = esc(text);
    terms.forEach(function (t) {
      safe = safe.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    });
    return safe;
  }

  function snippet(content, terms) {
    var lower = content.toLowerCase();
    var pos = -1;
    for (var i = 0; i < terms.length; i++) {
      pos = lower.indexOf(terms[i]);
      if (pos !== -1) break;
    }
    if (pos === -1) return content.slice(0, 120);
    var start = Math.max(0, pos - 50);
    var out = content.slice(start, start + 150);
    return (start > 0 ? '…' : '') + out + '…';
  }

  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index
      .map(function (d) {
        var score = 0;
        for (var i = 0; i < terms.length; i++) {
          var t = terms[i];
          var hit = false;
          if (d._title.indexOf(t) !== -1) { score += 6; hit = true; }
          if (d._tags.indexOf(t) !== -1) { score += 4; hit = true; }
          if (d._desc.indexOf(t) !== -1) { score += 3; hit = true; }
          if (d._content.indexOf(t) !== -1) { score += 1; hit = true; }
          if (!hit) return null; // every term must match somewhere
        }
        return { doc: d, score: score };
      })
      .filter(Boolean)
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 8);
  }

  function render(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      list.innerHTML = '<li class="search-empty">type to search notes, guides &amp; pages</li>';
      return;
    }
    var results = search(q);
    if (!results.length) {
      list.innerHTML = '<li class="search-empty">no matches for &ldquo;' + esc(q) + '&rdquo;</li>';
      return;
    }
    selected = 0;
    list.innerHTML = results.map(function (r, i) {
      var d = r.doc;
      return '<li class="search-result' + (i === 0 ? ' is-selected' : '') + '">' +
        '<a href="' + esc(d.url) + '">' +
          '<span class="search-result-kind">' + esc(d.kind) + (d.date ? ' · ' + esc(d.date) : '') + '</span>' +
          '<div class="search-result-title">' + highlight(d.title, terms) + '</div>' +
          '<div class="search-result-snippet">' + highlight(snippet(d.content || d.description, terms), terms) + '</div>' +
        '</a></li>';
    }).join('');
  }

  function moveSelection(delta) {
    var items = list.querySelectorAll('.search-result');
    if (!items.length) return;
    items[selected] && items[selected].classList.remove('is-selected');
    selected = (selected + delta + items.length) % items.length;
    items[selected].classList.add('is-selected');
    items[selected].scrollIntoView({ block: 'nearest' });
  }

  function open() {
    dialog.showModal();
    input.value = '';
    render('');
    loadIndex().then(function () { render(input.value); });
    input.focus();
  }

  openBtn.addEventListener('click', open);

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      dialog.open ? dialog.close() : open();
    }
    if (e.key === '/' && !dialog.open && !/^(input|textarea)$/i.test((document.activeElement || {}).tagName || '')) {
      e.preventDefault();
      open();
    }
  });

  input.addEventListener('input', function () {
    loadIndex().then(function () { render(input.value); });
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
    else if (e.key === 'Enter') {
      var current = list.querySelector('.search-result.is-selected a');
      if (current) { e.preventDefault(); window.location.href = current.href; }
    }
  });

  // close when clicking the backdrop
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
})();
