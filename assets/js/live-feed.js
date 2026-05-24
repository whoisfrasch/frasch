// Live Security Advisories Feed
// Pulls from the public GitHub Advisory Database API.
// CORS-friendly, no API key needed (60 req/hour per visitor IP).
// Cache in localStorage to be polite to the API.

(function () {
  const ENDPOINT = 'https://api.github.com/advisories?per_page=10&sort=published&direction=desc';
  const CACHE_KEY = 'ghsa.cache.v1';
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  const container = document.getElementById('live-feed');
  if (!container) return;

  function relativeTime(iso) {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const min = Math.floor(diff / 60000);
    if (min < 1)   return 'just now';
    if (min < 60)  return min + 'm ago';
    const h = Math.floor(min / 60);
    if (h < 24)    return h + 'h ago';
    const d = Math.floor(h / 24);
    if (d < 30)    return d + 'd ago';
    const mo = Math.floor(d / 30);
    if (mo < 12)   return mo + 'mo ago';
    return Math.floor(mo / 12) + 'y ago';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function truncate(s, n) {
    if (!s) return '';
    return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
  }

  function render(advisories) {
    if (!Array.isArray(advisories) || advisories.length === 0) {
      container.innerHTML = '<div class="feed-error">No advisories returned.</div>';
      return;
    }

    const html = advisories.map(a => {
      const sev = (a.severity || 'low').toLowerCase();
      const id = a.cve_id || a.ghsa_id || '—';
      const summary = truncate(a.summary || '', 140);
      let pkg = '';
      if (a.vulnerabilities && a.vulnerabilities.length > 0) {
        const v = a.vulnerabilities[0];
        if (v.package && v.package.name) {
          pkg = (v.package.ecosystem ? v.package.ecosystem + '/' : '') + v.package.name;
        }
      }
      const url = a.html_url || 'https://github.com/advisories/' + (a.ghsa_id || '');
      return `
        <a class="advisory" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          <div class="advisory-head">
            <span class="severity-badge severity-${escapeHtml(sev)}">${escapeHtml(sev)}</span>
            <span class="advisory-id">${escapeHtml(id)}</span>
            <span class="advisory-time">${escapeHtml(relativeTime(a.published_at))}</span>
          </div>
          <div class="advisory-summary">${escapeHtml(summary)}</div>
          ${pkg ? `<div class="advisory-pkg">${escapeHtml(pkg)}</div>` : ''}
        </a>
      `;
    }).join('');

    container.innerHTML = html;
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || !obj.data) return null;
      if (Date.now() - obj.ts > CACHE_TTL) return null;
      return obj.data;
    } catch (e) { return null; }
  }
  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (e) { /* ignore quota errors */ }
  }

  async function fetchFeed() {
    // 1) Try cache first (paint immediately)
    const cached = readCache();
    if (cached) render(cached);

    // 2) Fetch fresh in background
    try {
      const res = await fetch(ENDPOINT, {
        headers: { 'Accept': 'application/vnd.github+json' }
      });
      if (!res.ok) {
        if (!cached) {
          container.innerHTML = `<div class="feed-error">API responded ${res.status}. Try again later.</div>`;
        }
        return;
      }
      const data = await res.json();
      writeCache(data);
      render(data);
    } catch (err) {
      if (!cached) {
        container.innerHTML = '<div class="feed-error">Could not reach the advisory API. Check your connection.</div>';
      }
      console.error('[live-feed]', err);
    }
  }

  fetchFeed();
  // Refresh in-place every 10 minutes while the tab is open
  setInterval(fetchFeed, 10 * 60 * 1000);
})();
