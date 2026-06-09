(function () {
  // --- edit your sources here: add or remove freely ---
  var FEEDS = [
    { name: "the hacker news",  url: "https://feeds.feedburner.com/TheHackersNews" },
    { name: "bleepingcomputer", url: "https://www.bleepingcomputer.com/feed/" },
    { name: "project zero",     url: "https://googleprojectzero.blogspot.com/feeds/posts/default" }
  ];
  var MAX_ITEMS = 8;
  var API = "https://api.rss2json.com/v1/api.json?count=10&rss_url=";

  var container = document.getElementById("rss-feed");
  if (!container) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(d) {
    var t = new Date(d);
    return isNaN(t) ? "" : t.toISOString().slice(0, 10);
  }

  function fetchFeed(feed) {
    return fetch(API + encodeURIComponent(feed.url))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        if (!data || data.status !== "ok" || !data.items) return [];
        return data.items.map(function (it) {
          return { source: feed.name, title: it.title, link: it.link, date: it.pubDate };
        });
      })
      .catch(function () { return []; }); // per-feed fallback: just skip it
  }

  Promise.all(FEEDS.map(fetchFeed)).then(function (results) {
    var items = [].concat.apply([], results).filter(function (i) { return i.title && i.link; });
    items.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    items = items.slice(0, MAX_ITEMS);
    container.setAttribute("aria-busy", "false");

    if (items.length === 0) {
      container.innerHTML = '<div class="news-error">couldn\'t reach the feeds right now. try again later.</div>';
      return;
    }

    container.innerHTML = items.map(function (i) {
      return '<a class="news-item" href="' + esc(i.link) + '" target="_blank" rel="noopener noreferrer">' +
               '<span class="news-meta">' +
                 '<span class="news-src">' + esc(i.source) + '</span>' +
                 '<span class="news-date">' + esc(fmtDate(i.date)) + '</span>' +
               '</span>' +
               '<span class="news-headline">' + esc(i.title) + '</span>' +
             '</a>';
    }).join("");
  });
})();
