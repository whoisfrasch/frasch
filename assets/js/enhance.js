(function () {
  // copy-to-clipboard buttons on code blocks
  document.querySelectorAll('.post-content pre').forEach(function (pre) {
    var wrapper = (pre.parentElement && pre.parentElement.classList.contains('highlight'))
      ? pre.parentElement
      : pre;
    wrapper.classList.add('code-block');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.textContent = 'copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(pre.innerText.replace(/\n$/, '')).then(function () {
        btn.textContent = 'copied';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
    wrapper.appendChild(btn);
  });

  // hover anchors on post headings (kramdown auto-generates the ids)
  var headings = document.querySelectorAll('.post-content h1[id], .post-content h2[id], .post-content h3[id]');
  headings.forEach(function (h) {
    var a = document.createElement('a');
    a.className = 'heading-anchor';
    a.href = '#' + h.id;
    a.textContent = '#';
    a.setAttribute('aria-label', 'Link to this section');
    h.appendChild(a);
  });

  // table of contents (post layout only) — h1/h2 are section heads, h3 nested
  var tocList = document.querySelector('[data-toc]');
  var wrap = document.querySelector('.post-wrap');
  if (tocList && wrap && headings.length >= 2) {
    wrap.classList.add('has-toc');
    var links = {};
    headings.forEach(function (h) {
      var li = document.createElement('li');
      if (h.tagName === 'H3') li.className = 'toc-sub';
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.firstChild ? h.firstChild.textContent.trim() : h.textContent.trim();
      li.appendChild(a);
      tocList.appendChild(li);
      links[h.id] = a;
    });

    // scrollspy
    var activeId = null;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (activeId && links[activeId]) links[activeId].classList.remove('is-active');
          activeId = entry.target.id;
          links[activeId].classList.add('is-active');
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    headings.forEach(function (h) { observer.observe(h); });
  }

  // reading progress bar (post layout only)
  var bar = document.querySelector('.reading-progress');
  if (bar) {
    var update = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, doc.scrollTop / max) : 0) + ')';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }
})();
