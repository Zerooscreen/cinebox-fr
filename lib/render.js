const { img, slugify } = require('./tmdb');

const SITE_NAME = 'CineBox';
const DEFAULT_TITLE = 'ᐅ VOIR‼️ CineBox — Films et Séries en Streaming VF Gratuit';
const DEFAULT_DESC = 'Retrouvez le synopsis, la distribution, la note et la bande-annonce officielle des films et séries les plus populaires du moment en streaming VF gratuit.';
const DEFAULT_OG_IMAGE = 'https://placehold.co/1200x630/17171b/8d8a92?text=CineBox';

const GOOGLE_SITE_VERIFICATION = '<meta name="google-site-verification" content="M-_SCpf4h0A8JcaYgk3_kEfeagIFV6cKmqsg0iROtiI" />';

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function head({ title, description, url, image, type = 'website', robots = 'index, follow' }) {
  const t = escapeHtml(title || DEFAULT_TITLE);
  const d = escapeHtml((description || DEFAULT_DESC).slice(0, 160));
  const ogImg = image || DEFAULT_OG_IMAGE;
  return `
    <title>${t}</title>
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}" />
    <meta name="description" content="${d}">
    <meta name="robots" content="${robots}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="${type}">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:title" content="${t}">
    <meta property="og:description" content="${d}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${ogImg}">
    <meta property="og:locale" content="fr_FR">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t}">
    <meta name="twitter:description" content="${d}">
    <meta name="twitter:image" content="${ogImg}">
  `;
}

// --- Format Judul SEO Berdasarkan Permintaan ---
function seoMovieTitle(title, year) {
  const y = year || '2026';
  return `ᐅ VOIR‼️ ${title} (${y}) Streaming VF Gratuit`;
}

function seoTvTitle(title, year, season, episodeRange) {
  const y = year || '2026';
  if (episodeRange) {
    return `ᐅ VOIR‼️ ${title} Saison ${season} Épisodes ${episodeRange} en Streaming VF Gratuit`;
  }
  return `ᐅ VOIR‼️ ${title} (${y}) Saison ${season} en Streaming VF Gratuit`;
}

function seoDescription(title, year, genreNames) {
  const yearPart = year ? `(${year}) ` : '';
  const genrePart = genreNames ? `Genre: ${genreNames}. ` : '';
  return `Regarder ${title} ${yearPart}en streaming VF complet et gratuit. ${genrePart}Synopsis, distribution et bande-annonce sur CineBox.`;
}

function movieJsonLd(data, url) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: data.title,
    description: (data.overview || '').slice(0, 300),
    url,
    image: img(data.poster_path || data.backdrop_path, 'w780'),
    datePublished: data.release_date || undefined,
    genre: (data.genres || []).map(g => g.name),
  };
  if (data.vote_average && data.vote_count) {
    payload.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.vote_average.toFixed(1),
      ratingCount: data.vote_count,
      bestRating: '10',
      worstRating: '0',
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

function tvJsonLd(data, url) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: data.name,
    description: (data.overview || '').slice(0, 300),
    url,
    image: img(data.poster_path || data.backdrop_path, 'w780'),
    datePublished: data.first_air_date || undefined,
    genre: (data.genres || []).map(g => g.name),
    numberOfSeasons: data.number_of_seasons || undefined,
    numberOfEpisodes: data.number_of_episodes || undefined,
  };
  if (data.vote_average && data.vote_count) {
    payload.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.vote_average.toFixed(1),
      ratingCount: data.vote_count,
      bestRating: '10',
      worstRating: '0',
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

function personJsonLd(person, url) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    description: (person.biography || '').slice(0, 300),
    url,
    image: img(person.profile_path, 'w780'),
  };
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

// ---------- Iklan & Script Pendukung ----------
function bannerScript(key, width, height) {
  return `<script>atOptions = { 'key' : '${key}', 'format' : 'iframe', 'height' : ${height}, 'width' : ${width}, 'params' : {} };</script><script src="https://www.highperformanceformat.com/${key}/invoke.js"></script>`;
}
function topBannerAd() {
  return `
    <div class="ad-slot ad-desktop-only">${bannerScript('9eab15e2d0d97de74e3ee971fe615a5e', 728, 90)}</div>
    <div class="ad-slot ad-mobile-only">${bannerScript('374f3cbadfdea331b749dcfc79f79f2c', 320, 50)}</div>
  `;
}
function sideBannerAd() {
  return `<div class="ad-slot ad-desktop-only">${bannerScript('25247fde261d8f76e06b91b9d74945f4', 160, 600)}</div>`;
}
function nativeBannerAd() {
  return `
    <div class="ad-slot ad-native">
      <script async data-cfasync="false" src="https://pl30557737.effectivecpmnetwork.com/6f7b03feb080b4884047d6210ed8268e/invoke.js"></script>
      <div id="container-6f7b03feb080b4884047d6210ed8268e"></div>
    </div>
  `;
}
function socialBarScript() {
  return `<script src="https://pl30557736.effectivecpmnetwork.com/af/c1/6d/afc16d8a70f1f493abf2098939fca8f7.js"></script>`;
}

function histatsSnippet() {
  return `
    <div id="histats_counter" style="display:none;"></div>
    <script type="text/javascript">
    var _Hasync = _Hasync || [];
    _Hasync.push(['Histats.start', '1,5014113,4,1,120,40,00011111']);
    _Hasync.push(['Histats.fasi', '1']);
    _Hasync.push(['Histats.track_hits', '']);
    (function() {
      var hs = document.createElement('script'); hs.type = 'text/javascript'; hs.async = true;
      hs.src = ('//s10.histats.com/js15_as.js');
      (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
    })();
    </script>
    <noscript><a href="/" target="_blank"><img src="//sstatic1.histats.com/0.gif?5014113&101" alt="" border="0" style="display:none;"></a></noscript>
  `;
}

function layout({ headHtml, bodyHtml, activeTab = 'movie' }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${headHtml}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<style>
  .ad-slot { display: flex; justify-content: center; align-items: center; margin: 20px auto; overflow: hidden; }
  .ad-mobile-only { display: none; }
  @media (max-width: 768px) {
    .ad-desktop-only { display: none; }
    .ad-mobile-only { display: flex; }
  }
  .btn-watch-glow {
    display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    background: linear-gradient(135deg, #ff2d55 0%, #e50914 100%);
    color: #fff; font-size: 18px; font-weight: 800; padding: 16px 36px;
    border-radius: 50px; text-decoration: none; box-shadow: 0 0 25px rgba(255,45,85,0.5);
    transition: all 0.3s ease; border: 1px solid rgba(255,255,255,0.2);
  }
  .btn-watch-glow:hover {
    transform: translateY(-3px); box-shadow: 0 0 35px rgba(255,45,85,0.8);
  }
  .premium-watch-box {
    background: linear-gradient(145deg, #1f1e24, #121115);
    border: 1px solid rgba(255,45,85,0.3); border-radius: 16px;
    padding: 30px; text-align: center; margin: 30px 0;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .watch-badge-group {
    display: flex; justify-content: center; gap: 15px; margin-top: 15px; flex-wrap: wrap;
  }
  .watch-badge {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    padding: 6px 14px; border-radius: 20px; font-size: 12px; color: #ccc;
  }
  .person-profile-header {
    display: flex; gap: 30px; align-items: flex-start; flex-wrap: wrap;
    background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 30px; margin: 20px 0;
  }
  .person-img { width: 220px; border-radius: 12px; object-fit: cover; aspect-ratio: 2/3; }
  .person-details { flex: 1; min-width: 280px; }
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <a class="logo" href="/movie">Cine<span>Box</span></a>
    <nav class="tabs">
      <a class="tab-btn ${activeTab === 'movie' ? 'active' : ''}" href="/movie">Films</a>
      <a class="tab-btn ${activeTab === 'tv' ? 'active' : ''}" href="/tv">Séries</a>
    </nav>
    <div class="search-wrap">
      <input id="search-input" type="text" placeholder="Rechercher un titre..." autocomplete="off">
      <div class="search-results" id="search-results"></div>
    </div>
  </div>
</header>
${topBannerAd()}
<main>
${bodyHtml}
</main>
<footer>
  <p>CineBox — site d'informations sur les films et séries basé sur les données publiques de TMDB (ce n'est pas un service de streaming) · Powered by <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a></p>
  ${histatsSnippet()}
</footer>
<script src="/app.js"></script>
${socialBarScript()}
</body>
</html>`;
}

function posterCard(item, type) {
  const title = item.title || item.name;
  const date = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '-';
  const slug = slugify(title);
  return `
    <a class="poster-card" href="/${type}/${item.id}/${encodeURIComponent(slug)}">
      <div class="poster-frame">
        <img src="${img(item.poster_path)}" alt="${escapeHtml(title)}" loading="lazy">
        <div class="poster-badge">★ ${rating}</div>
      </div>
      <div class="poster-title">${escapeHtml(title)}</div>
      <div class="poster-sub">${date || 'Année inconnue'}</div>
    </a>
  `;
}

function genreRow(genres) {
  if (!genres || !genres.length) return '';
  return `<div class="genre-row">${genres.map(g => `<span class="genre-pill">${escapeHtml(g.name)}</span>`).join('')}</div>`;
}

function trailerBlock(videos) {
  const list = (videos && videos.results) || [];
  const trailer = list.find(v => v.site === 'YouTube' && v.type === 'Trailer') || list.find(v => v.site === 'YouTube');
  if (!trailer) return `<div class="no-trailer">Aucune bande-annonce disponible.</div>`;
  return `
    <div class="trailer-wrap">
      <iframe src="https://www.youtube.com/embed/${trailer.key}" title="trailer" allowfullscreen loading="lazy"></iframe>
    </div>
  `;
}

function castGrid(credits) {
  const cast = ((credits && credits.cast) || []).slice(0, 12);
  if (!cast.length) return `<div class="empty">Informations sur la distribution non disponibles.</div>`;
  return `<div class="cast-grid">${cast.map(c => `
    <a class="cast-card" href="/person/${c.id}/${encodeURIComponent(slugify(c.name))}" style="text-decoration:none; color:inherit; display:block;">
      <img src="${img(c.profile_path, 'w185')}" alt="${escapeHtml(c.name)}" loading="lazy">
      <div class="cast-name">${escapeHtml(c.name)}</div>
      <div class="cast-role">${escapeHtml(c.character || '')}</div>
    </a>
  `).join('')}</div>`;
}

module.exports = { 
  head, 
  layout, 
  posterCard, 
  genreRow, 
  trailerBlock, 
  castGrid, 
  escapeHtml, 
  movieJsonLd, 
  tvJsonLd, 
  personJsonLd,
  seoMovieTitle,
  seoTvTitle,
  seoDescription,
  sideBannerAd, 
  nativeBannerAd, 
  DEFAULT_TITLE, 
  DEFAULT_DESC, 
  SITE_NAME 
};
