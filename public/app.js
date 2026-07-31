// ---------- SEARCH ----------
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchTimeout;

if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (!q) { searchResults.classList.remove('show'); return; }
    searchTimeout = setTimeout(() => doSearch(q), 350);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) searchResults.classList.remove('show');
  });
}

async function doSearch(q) {
  try {
    const res = await fetch('/api/search?q=' + encodeURIComponent(q));
    const data = await res.json();
    if (!data.results.length) {
      searchResults.innerHTML = `<div class="empty" style="padding:16px;">ไม่พบผลการค้นหา</div>`;
    } else {
      searchResults.innerHTML = data.results.map(item => `
        <a class="sr-item" href="/${item.type}/${item.id}/${item.slug}">
          <img src="${item.poster}" alt="${item.title}">
          <div>
            <div class="sr-title">${item.title}</div>
            <div class="sr-meta">${item.type === 'movie' ? 'ภาพยนตร์' : 'ซีรีส์'} · ${item.year || 'ไม่ทราบปี'}</div>
          </div>
        </a>
      `).join('');
    }
    searchResults.classList.add('show');
  } catch (e) { /* diamkan */ }
}

// ---------- SEASON / EPISODE TOGGLE ----------
document.querySelectorAll('.season-head').forEach(head => {
  head.addEventListener('click', () => toggleSeason(head));
});

async function toggleSeason(headEl) {
  const item = headEl.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.season-item.open').forEach(el => {
    if (el !== item) el.classList.remove('open');
  });
  item.classList.toggle('open');
  if (isOpen) return;

  const panel = item.querySelector('.episode-panel');
  const tvId = item.dataset.tv;
  const seasonNum = item.dataset.season;
  if (panel.dataset.loaded === '1') return;

  panel.innerHTML = `<div class="loading">กำลังโหลด...</div>`;
  try {
    const res = await fetch(`/api/season/${tvId}/${seasonNum}`);
    const data = await res.json();
    panel.innerHTML = (data.episodes || []).map(ep => `
      <a href="/watch/${tvId}/${seasonNum}/${ep.number}" class="episode-row" style="text-decoration:none;color:inherit;display:flex;gap:15px;align-items:center;">
        <img src="${ep.still}" alt="${ep.name || ''}">
        <div>
          <div class="ep-num">EP ${ep.number}</div>
          <div class="ep-title">${ep.name || ''}</div>
          <div class="ep-meta">${ep.airDate || 'ไม่ทราบวันที่'} · ★ ${ep.rating}</div>
          <div class="ep-overview">${ep.overview || 'ไม่มีเรื่องย่อ'}</div>
        </div>
      </a>
    `).join('') || `<div class="empty">ไม่พบข้อมูลตอน</div>`;
    panel.dataset.loaded = '1';
  } catch (e) {
    panel.innerHTML = `<div class="empty">ไม่สามารถโหลดข้อมูลตอนได้</div>`;
  }
}
