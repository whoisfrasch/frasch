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
  document.querySelectorAll('.post-content h1[id], .post-content h2[id], .post-content h3[id]')
    .forEach(function (h) {
      var a = document.createElement('a');
      a.className = 'heading-anchor';
      a.href = '#' + h.id;
      a.textContent = '#';
      a.setAttribute('aria-label', 'Link to this section');
      h.appendChild(a);
    });
})();
