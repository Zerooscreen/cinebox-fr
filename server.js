const express = require('express');
const path = require('path');
const { tmdb, img, slugify } = require('./lib/tmdb');
const { 
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
} = require('./lib/render');

const app = express();
const PORT = process.env.PORT || 3000;

const SITE_URL = process.env.SITE_URL || 'https://cinebox-fr.up.railway.app';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ROWS = {
  movie: [
    { key: '01', title: 'Films tendance', path: '/trending/movie/week' },
    { key: '02', title: 'Films populaires', path: '/movie/popular' },
    { key: '03', title: 'Films les mieux notés', path: '/movie/top_rated' },
    { key: '04', title: 'Prochainement au cinéma', path: '/movie/upcoming' },
  ],
  tv: [
    { key: '01', title: 'Séries tendance', path: '/trending/tv/week' },
    { key: '02', title: 'Séries populaires', path: '/tv/popular' },
    { key: '03', title: 'Séries les mieux notées', path: '/tv/top_rated' },
    { key: '04', title: 'Séries en cours de diffusion', path: '/tv/on_the_air' },
  ],
};

// ---------- HOME (/, /movie, /tv) ----------
async function renderHome(req, res, tab) {
  try {
    const heroData = await tmdb(tab === 'movie' ? '/trending/movie/week' : '/trending/tv/week');
    const hero = heroData.results[0];
    const heroTitle = hero ? (hero.title || hero.name) : SITE_NAME;
    const heroOverview = hero ? (hero.overview || '') : '';

    const rowsHtml = [];
    for (const def of ROWS[tab]) {
      const data = await tmdb(def.path);
      const cards = data.results.slice(0, 12).map(item => posterCard(item, tab)).join('');
      rowsHtml.push(`
        <section class="row">
          <div class="row-head"><span class="row-num">${def.key}</span><h2>${def.title}</h2></div>
          <div class="grid">${cards}</div>
        </section>
      `);
    }

    const heroHtml = hero ? `
      <div id="hero">
        <div class="hero-bg" style="background-image:url('${img(hero.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="hero-content">
          <div class="hero-eyebrow">Tendance de la semaine</div>
          <div class="hero-title">${escapeHtml(heroTitle)}</div>
          <div class="hero-overview">${escapeHtml(heroOverview).slice(0, 180)}${heroOverview.length > 180 ? '…' : ''}</div>
          <a class="hero-btn" href="/${tab}/${hero.id}/${encodeURIComponent(slugify(heroTitle))}">Voir plus ▸</a>
        </div>
      </div>` : '';

    const bodyHtml = heroHtml + `<div id="rows">${rowsHtml.join('')}</div>`;

    const headHtml = head({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      url: `${SITE_URL}/${tab}`,
      image: hero ? img(hero.backdrop_path, 'w780') : null,
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: tab }));
  } catch (e) {
    res.status(500).send(layout({
      headHtml: head({ title: DEFAULT_TITLE, description: DEFAULT_DESC, url: `${SITE_URL}/${tab}` }),
      bodyHtml: `<div class="empty">Impossible de charger les données. Veuillez réessayer plus tard.</div>`,
      activeTab: tab,
    }));
  }
}

app.get('/', (req, res) => renderHome(req, res, 'movie'));
app.get('/movie', (req, res) => renderHome(req, res, 'movie'));
app.get('/tv', (req, res) => renderHome(req, res, 'tv'));

// ---------- DETAIL: /movie/:id/:slug? ----------
app.get('/movie/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos, similar] = await Promise.all([
      tmdb(`/movie/${id}`),
      tmdb(`/movie/${id}/credits`),
      tmdb(`/movie/${id}/videos`),
      tmdb(`/movie/${id}/similar`),
    ]);
    const correctSlug = slugify(data.title);
    if (req.params.slug !== correctSlug) {
      return res.redirect(301, `/movie/${id}/${encodeURIComponent(correctSlug)}`);
    }

    const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}min` : 'Non renseigné';
    const englishSlug = slugify(data.original_title || data.title);

    const bodyHtml = `
      <a class="back-btn" href="/movie">← Retour</a>

      <nav class="breadcrumb">
        <a href="/">Accueil</a> /
        <a href="/movie">Films</a> /
        <span>${escapeHtml(data.title)}</span>
      </nav>

      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="Affiche ${escapeHtml(data.title)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">Film</div>
          <h1 class="detail-title">${escapeHtml(data.title)}</h1>
          <div class="detail-orig">${escapeHtml(data.original_title)} · ${(data.release_date || '').slice(0, 4) || '2026'}</div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${runtime}</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
          </div>
          <div class="detail-overview">
            <h2>Synopsis</h2>
            <p>${escapeHtml(data.overview || 'Synopsis non disponible')}</p>
          </div>
          ${genreRow(data.genres)}
          
          <div class="action-buttons">
            <a href="javascript:void(0)"
               class="btn-trailer"
               onclick="document.getElementById('trailer')?.scrollIntoView({behavior:'smooth'})">
               🎬 Bande-annonce
            </a>
            <a href="https://www.themoviedb.org/movie/${data.id}"
               target="_blank"
               class="btn-tmdb">
               TMDB
            </a>
            <button
               class="btn-share"
               onclick="navigator.share ? navigator.share({
               title:'${escapeHtml(data.title)}',
               url:window.location.href
               }) : navigator.clipboard.writeText(window.location.href)">
               Partager
            </button>
          </div>
        </div>
      </div>

      <div class="premium-watch-box">
        <a href="/watch/${id}/${englishSlug}"
            class="btn-watch-glow">
            <span>▶</span> Regarder le Film en Complet HD
        </a>
        <div class="watch-badge-group">
          <span class="watch-badge">⚡ VF / VOSTFR</span>
          <span class="watch-badge">🎬 Ultra HD 4K</span>
          <span class="watch-badge">🔥 Gratuit & Sans Pub Intrusive</span>
        </div>
      </div>
      
      ${nativeBannerAd()}
      <div id="trailer" class="section-block trailer-wrap"><h3>Bande-annonce</h3>${trailerBlock(videos)}</div>
      
      <div class="section-block">
        <h3>Distribution (Cliquez sur un acteur pour voir sa filmographie)</h3>
        ${castGrid(credits)}
      </div>

      ${sideBannerAd()}

      <div class="section-block">
        <h3>Films similaires</h3>
        <div class="similar-grid">
        ${(similar.results || []).slice(0,8).map(m => `
          <a class="poster-card" href="/movie/${m.id}/${encodeURIComponent(slugify(m.title))}">
            <img src="${img(m.poster_path)}" alt="${escapeHtml(m.title)}" loading="lazy">
            <div class="poster-title">${escapeHtml(m.title)}</div>
          </a>
        `).join('')}
        </div>
      </div>
      ${movieJsonLd(data, `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const movieYear = (data.release_date || '').slice(0, 4) || '2026';
    const headHtml = head({
      title: seoMovieTitle(data.title, movieYear),
      description: seoDescription(data.title, movieYear, (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.movie',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({
        title: 'Film introuvable · CineBox',
        description: DEFAULT_DESC,
        url: `${SITE_URL}/movie/${id}`,
        robots: 'noindex, nofollow',
      }),
      bodyHtml: `<a class="back-btn" href="/movie">← Retour</a><div class="empty">Film introuvable</div>`,
      activeTab: 'movie',
    }));
  }
});

// ---------- WATCH / REDIRECT PAGE (MOVIES) ----------
app.get('/watch/:id/:slug?', async (req, res) => {
  const { id } = req.params;

  try {
    const data = await tmdb(`/movie/${id}`);
    const englishSlug = slugify(data.original_title || data.title);
    const targetUrl = `https://zeromovies4k.net/fr/movie/${id}/${englishSlug}end`;

    res.send(layout({
      headHtml: head({
        title: `Lecture de ${data.title}`,
        description: data.overview || DEFAULT_DESC,
        url: `${SITE_URL}/watch/${id}/${englishSlug}`,
        robots: 'noindex, nofollow',
      }),

      bodyHtml: `
        <div class="watch-page" style="max-width:850px;margin:60px auto;text-align:center;padding:40px 20px;background:#17171b;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08)">
          <h2 style="font-size:28px;margin-bottom:15px">🎬 ${escapeHtml(data.title)}</h2>

          <div style="position:relative;width:100%;height:320px;background:#000 url('${img(data.backdrop_path, 'w780')}') center/cover;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;margin:25px 0">
             <div style="position:absolute;inset:0;background:rgba(0,0,0,0.75)"></div>
             <div style="position:relative;z-index:2">
                <p style="font-size:18px;color:#ddd;margin-bottom:10px">Préparation du lecteur HD...</p>
                <div id="countdown" style="font-size:64px;font-weight:900;color:#ff2d55;text-shadow:0 0 20px rgba(255,45,85,0.6)">5</div>
                <p style="font-size:14px;color:#aaa">Redirection automatique vers le flux vidéo</p>
             </div>
          </div>

          <a href="${targetUrl}"
             class="btn-watch-glow"
             id="goNow"
             style="display:none;margin-top:20px">
             ▶ Regarder maintenant (Cliquez ici)
          </a>

          <script>
            let sec = 5;
            const el = document.getElementById('countdown');
            const goBtn = document.getElementById('goNow');

            const timer = setInterval(() => {
              sec--;
              if(el) el.textContent = sec;

              if(sec <= 0){
                clearInterval(timer);
                if(goBtn) goBtn.style.display = 'inline-flex';
                window.location.href = "${targetUrl}";
              }
            }, 1000);
          </script>
        </div>
      `,
      activeTab: 'movie'
    }));
  } catch (e) {
    res.redirect(`/movie/${id}`);
  }
});

// ---------- WATCH / REDIRECT PAGE (TV EPISODES) ----------
app.get('/watch/:id/:season/:episode', async (req, res) => {
  const { id, season, episode } = req.params;

  try {
    const data = await tmdb(`/tv/${id}`);
    const englishSlug = slugify(data.original_name || data.name);
    const targetUrl = `https://zeromovies4k.net/fr/tv/${id}/${season}/${episode}/${englishSlug}end`;
    
    const tvYear = (data.first_air_date || '').slice(0, 4) || '2026';
    const tvTitle = data.name || '';
    const customTvWatchTitle = `ᐅ VOIR‼️ ${tvTitle} Saison ${season} Épisodes ${episode} en Streaming VF Gratuit`;

    res.send(layout({
      headHtml: head({
        title: customTvWatchTitle,
        description: data.overview || DEFAULT_DESC,
        url: `${SITE_URL}/watch/${id}/${season}/${episode}`,
        robots: 'noindex, nofollow',
      }),

      bodyHtml: `
        <div class="watch-page" style="max-width:850px;margin:60px auto;text-align:center;padding:40px 20px;background:#17171b;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08)">
          <h2 style="font-size:28px;margin-bottom:15px;color:#fff">🎬 ${escapeHtml(data.name)} - Saison ${season} Épisode ${episode}</h2>

          <div style="position:relative;width:100%;height:320px;background:#000 url('${img(data.backdrop_path, 'w780')}') center/cover;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;margin:25px 0">
             <div style="position:absolute;inset:0;background:rgba(0,0,0,0.75)"></div>
             <div style="position:relative;z-index:2">
                <p style="font-size:18px;color:#ddd;margin-bottom:10px">Préparation du lecteur HD...</p>
                <div id="countdown" style="font-size:64px;font-weight:900;color:#ff2d55;text-shadow:0 0 20px rgba(255,45,85,0.6)">5</div>
                <p style="font-size:14px;color:#aaa">Redirection automatique vers le flux vidéo</p>
             </div>
          </div>

          <a href="${targetUrl}"
             class="btn-watch-glow"
             id="goNow"
             style="display:none;margin-top:20px">
             ▶ Regarder maintenant (Cliquez ici)
          </a>

          <script>
            let sec = 5;
            const el = document.getElementById('countdown');
            const goBtn = document.getElementById('goNow');

            const timer = setInterval(() => {
              sec--;
              if(el) el.textContent = sec;

              if(sec <= 0){
                clearInterval(timer);
                if(goBtn) goBtn.style.display = 'inline-flex';
                window.location.href = "${targetUrl}";
              }
            }, 1000);
          </script>
        </div>
      `,
      activeTab: 'tv'
    }));
  } catch (e) {
    res.redirect(`/tv/${id}`);
  }
});

// ---------- ACTOR / PERSON DETAIL PAGE ----------
app.get('/person/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [person, credits] = await Promise.all([
      tmdb(`/person/${id}`),
      tmdb(`/person/${id}/combined_credits`),
    ]);

    const correctSlug = slugify(person.name);
    if (req.params.slug !== correctSlug) {
      return res.redirect(301, `/person/${id}/${encodeURIComponent(correctSlug)}`);
    }

    const knownFor = (credits.cast || [])
      .filter(item => item.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 18);

    const cardsHtml = knownFor.map(item => posterCard(item, item.media_type || 'movie')).join('');

    const bodyHtml = `
      <a class="back-btn" href="javascript:history.back()">← Retour</a>

      <div class="person-profile-header">
        <img class="person-img" src="${img(person.profile_path, 'w500')}" alt="${escapeHtml(person.name)}">
        <div class="person-details">
          <h1 style="font-size:32px;margin-bottom:10px">${escapeHtml(person.name)}</h1>
          <p style="color:#aaa;margin-bottom:15px">
            ${person.birthday ? `Né(e) le : ${person.birthday}` : ''} 
            ${person.place_of_birth ? `· ${escapeHtml(person.place_of_birth)}` : ''}
          </p>
          <div class="section-block" style="margin-top:15px">
            <h3 style="font-size:18px;margin-bottom:8px">Biographie</h3>
            <p style="color:#ccc;line-height:1.6;max-height:200px;overflow-y:auto">
              ${escapeHtml(person.biography) || 'Aucune biographie disponible.'}
            </p>
          </div>
        </div>
      </div>

      <div class="section-block">
        <h3>Filmographie de ${escapeHtml(person.name)}</h3>
        <div class="grid">${cardsHtml || '<div class="empty">Aucune œuvre trouvée</div>'}</div>
      </div>

      ${personJsonLd(person, `${SITE_URL}/person/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const headHtml = head({
      title: `${person.name} - Biographie et Filmographie | CineBox`,
      description: (person.biography || DEFAULT_DESC).slice(0, 160),
      url: `${SITE_URL}/person/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(person.profile_path, 'w780'),
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({ title: 'Acteur introuvable', description: DEFAULT_DESC, url: `${SITE_URL}/person/${id}` }),
      bodyHtml: `<a class="back-btn" href="/">← Retour</a><div class="empty">Acteur introuvable</div>`,
      activeTab: 'movie',
    }));
  }
});

// ---------- DETAIL: /tv/:id/:slug? ----------
app.get('/tv/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos] = await Promise.all([
      tmdb(`/tv/${id}`),
      tmdb(`/tv/${id}/credits`),
      tmdb(`/tv/${id}/videos`),
    ]);
    const correctSlug = slugify(data.name);
    if (req.params.slug !== correctSlug) {
      return res.redirect(301, `/tv/${id}/${encodeURIComponent(correctSlug)}`);
    }

    const seasons = (data.seasons || []).filter(s => s.season_number >= 0);
    const seasonsHtml = seasons.map(s => `
      <div class="season-item" data-season="${s.season_number}" data-tv="${id}">
        <div class="season-head">
          <img src="${img(s.poster_path, 'w92')}" alt="${escapeHtml(s.name)}">
          <div>
            <div class="s-title">${escapeHtml(s.name)}</div>
            <div class="s-meta">${s.episode_count} épisodes · ${(s.air_date || '').slice(0, 4) || '2026'}</div>
          </div>
          <div class="chev">▶</div>
        </div>
        <div class="episode-panel"></div>
      </div>
    `).join('');

    const bodyHtml = `
      <a class="back-btn" href="/tv">← Retour</a>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="Affiche ${escapeHtml(data.name)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">Série</div>
          <h1 class="detail-title">${escapeHtml(data.name)}</h1>
          <div class="detail-orig">${escapeHtml(data.original_name)} · ${(data.first_air_date || '').slice(0, 4) || '2026'}</div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${data.number_of_seasons || '-'} saisons</span>
            <span class="m-item">${data.number_of_episodes || '-'} épisodes</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
          </div>
          ${genreRow(data.genres)}
        </div>
      </div>
      <div class="section-block"><h3>Synopsis</h3><div class="bio-text">${escapeHtml(data.overview) || 'Synopsis non disponible'}</div></div>
      ${nativeBannerAd()}
      <div class="section-block"><h3>Bande-annonce</h3>${trailerBlock(videos)}</div>
      <div class="section-block">
        <h3>Distribution</h3>
        ${castGrid(credits)}
      </div>
      <div class="section-block">
        <h3>Saisons et épisodes</h3>
        <div class="season-list" id="season-list">${seasonsHtml}</div>
      </div>
      ${sideBannerAd()}
      ${tvJsonLd(data, `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const tvYear = (data.first_air_date || '').slice(0, 4) || '2026';
    const headHtml = head({
      title: seoTvTitle(data.name, tvYear, data.number_of_seasons || 1, `1 à ${data.number_of_episodes || 8}`),
      description: seoDescription(data.name, tvYear, (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.tv_show',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'tv' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({
        title: 'Série introuvable · CineBox',
        description: DEFAULT_DESC,
        url: `${SITE_URL}/tv/${id}`,
        robots: 'noindex, nofollow',
      }),
      bodyHtml: `<a class="back-btn" href="/tv">← Retour</a><div class="empty">Série introuvable</div>`,
      activeTab: 'tv',
    }));
  }
});

// ---------- API PROXY ----------
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.json({ results: [] });
    const data = await tmdb('/search/multi', { query: q });
    const results = data.results
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 8)
      .map(r => ({
        id: r.id,
        type: r.media_type,
        title: r.title || r.name,
        year: (r.release_date || r.first_air_date || '').slice(0, 4),
        poster: img(r.poster_path, 'w92'),
        slug: slugify(r.title || r.name),
      }));
    res.json({ results });
  } catch (e) {
    res.status(500).json({ results: [], error: true });
  }
});

app.get('/api/season/:tvId/:seasonNumber', async (req, res) => {
  try {
    const { tvId, seasonNumber } = req.params;
    const data = await tmdb(`/tv/${tvId}/season/${seasonNumber}`);
    const episodes = (data.episodes || []).map(ep => ({
      number: ep.episode_number,
      name: ep.name,
      airDate: ep.air_date,
      rating: ep.vote_average ? ep.vote_average.toFixed(1) : '-',
      overview: ep.overview,
      still: img(ep.still_path, 'w300'),
    }));
    res.json({ episodes });
  } catch (e) {
    res.status(500).json({ episodes: [], error: true });
  }
});

// ---------- SITEMAP ----------
app.get('/sitemap.xml', async (req, res) => {
  try {
    const [mp, mt, tp, tt] = await Promise.all([
      tmdb('/movie/popular'),
      tmdb('/movie/top_rated'),
      tmdb('/tv/popular'),
      tmdb('/tv/top_rated'),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${SITE_URL}/movie`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/tv`, priority: '1.0', changefreq: 'daily' },
      ...[...mp.results, ...mt.results].map(m => ({ loc: `${SITE_URL}/movie/${m.id}/${encodeURIComponent(slugify(m.title))}`, priority: '0.7', changefreq: 'weekly' })),
      ...[...tp.results, ...tt.results].map(t => ({ loc: `${SITE_URL}/tv/${t.id}/${encodeURIComponent(slugify(t.name))}`, priority: '0.7', changefreq: 'weekly' })),
    ];
    const uniq = [...new Map(urls.map(u => [u.loc, u])).values()];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniq.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  } catch (e) {
    res.status(500).send('');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`);
});

app.listen(PORT, () => {
  console.log(`CineBox (FR) Server running on port: ${PORT}`);
});
