/* MOMENTO main site: fills the page from content/*.json (edited in the CMS at /admin),
   then loads the motion layer (GSAP + Lenis + js/main.js). */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isVid = p => /\.(mp4|webm|mov)$/i.test(p || '');
  const arrow = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8.5 7H17v8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // Title-case text typed in ALL CAPS; leave mixed-case text exactly as the editor wrote it.
  const cap = s => {
    s = String(s || '').trim();
    if (s !== s.toUpperCase()) return s;
    return s.toLowerCase().replace(/(^|[\s(\[/-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase())
      .replace(/\b(Dj|Djs|B2b|Ldn|Gb|Uk|Lfw|Mj|Haz)\b/g, w => w.toUpperCase()).replace(/\b([A-Z][a-z]?\d\w*)\b/g, w => w.toUpperCase());
  };
  const cleanTitle = t => cap(String(t || '').replace(/^\s*momento\s+presents\s*:\s*/i, '').trim());

  /* dates: same rules as before, so the CMS behaves the same way */
  const todayISO = new Date().toISOString().slice(0, 10);
  const parseDisplay = s => {
    let m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(s || ''); if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = /(\d{2})\.(\d{2})\.(\d{2})(?!\d)/.exec(s || ''); return m ? `20${m[3]}-${m[2]}-${m[1]}` : '';
  };
  const fmt = (iso, fb, o = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', o) : (fb || 'TBA');
  const still = e => isVid(e.poster) ? (e.posterImage || '') : (e.poster || e.posterImage || '');
  const vidLi = (src, poster) => `<li class="reel__item"><video src="${esc(src)}"${poster ? ` poster="${esc(poster)}"` : ''} muted loop playsinline preload="none"></video></li>`;

  const loadScript = src => new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = s.onerror = res; document.body.appendChild(s); });
  const motion = async () => {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js');
    await loadScript('https://unpkg.com/lenis@1.1.13/dist/lenis.min.js');
    await loadScript('js/main.js?v=1');
  };

  Promise.all([
    fetch('content/site.json').then(r => r.json()),
    fetch('content/events.json').then(r => r.json()),
  ]).then(([site, ev]) => { try { render(site || {}, ev || {}); } catch (e) { console.warn(e); } })
    .catch(e => console.warn('content load failed', e))
    .finally(motion);

  function render(site, ev) {
    const t = site.ticketLinks || {};
    const hero = ev.hero || {};

    /* ---------- events ---------- */
    const all = (ev.events || []).map(e => ({ ...e, iso: e.dateISO || parseDisplay(e.date) }));
    const future = all.filter(e => !e.iso || e.iso >= todayISO).sort((a, b) => !a.iso ? 1 : !b.iso ? -1 : a.iso.localeCompare(b.iso));
    const past = all.filter(e => e.iso && e.iso < todayISO).sort((a, b) => b.iso.localeCompare(a.iso));
    const feat = future[0] || past[0];
    const upcoming = !!future[0];
    const featName = feat ? cleanTitle(feat.title) : '';
    const tixUrl = feat && upcoming ? (feat.residentAdvisorUrl || feat.eventbriteUrl || '') : '';
    document.querySelectorAll('[data-tix]').forEach(a => { if (tixUrl) { a.href = tixUrl; a.target = '_blank'; a.rel = 'noopener'; } });

    /* ---------- hero ---------- */
    const clips = (hero.videos || []).filter(v => v && v.video);
    const hv = $('.hero__video');
    if (clips.length) {
      let k = 0;
      const set = i => { hv.poster = clips[i].poster || ''; hv.src = clips[i].video; hv.play().catch(() => {}); };
      if (clips.length > 1) hv.addEventListener('ended', () => { k = (k + 1) % clips.length; set(k); }); else hv.loop = true;
      set(0);
    }
    if (hero.headline) {
      const w = hero.headline.trim().split(/\s+/), last = w.pop();
      $('#heroTitle').innerHTML = `<span class="ln">${esc(w.join(' '))}</span><span class="ln">${esc(last)}</span>`;
    }
    if (hero.subtext) $('#heroSub').textContent = hero.subtext;
    if (feat) {
      $('#heroChips').innerHTML = `
        <a class="chip chip--solid" href="#tickets"><small>${upcoming ? 'Next moment' : 'Latest moment'}<br>${esc(featName)}</small><b>${esc(fmt(feat.iso, feat.date, { day: '2-digit', month: '2-digit' }).replace('/', '.'))}</b></a>
        <a class="chip" href="#past"><small>Nights<br>so far</small><b>${past.length + (ev.pastEvents || []).length}</b></a>`;
    }
    const genres = ((site.brand && site.brand.genres) || '').split('/').map(s => s.trim()).filter(Boolean);
    $('#heroTags').innerHTML = [hero.location || 'London / Madrid', ...genres].map(x => `<span>${esc(x)}</span>`).join('');

    /* ---------- tickets ---------- */
    $('#tixLabel').textContent = upcoming ? 'Next moment' : 'Latest moment';
    if (feat) {
      $('#tixCity').textContent = [cap(feat.venue), cap(feat.city)].filter(Boolean).join(' / ');
      const ra = feat.residentAdvisorUrl || '', eb = feat.eventbriteUrl || '';
      const media = isVid(feat.poster)
        ? `<video src="${esc(feat.poster)}" poster="${esc(feat.posterImage || '')}" muted autoplay loop playsinline></video>`
        : (still(feat) ? `<img class="pcard__bg" src="${esc(still(feat))}" alt="" aria-hidden="true"><img class="pcard__img" src="${esc(still(feat))}" alt="${esc(featName)} poster">` : '');
      const rows = [['Date', fmt(feat.iso, feat.date)], ['Time', feat.time], ['Venue', [cap(feat.venue), cap(feat.city)].filter(Boolean).join(', ')],
        [cap(feat.soundLabel) || 'Sound', (feat.sound || []).map(s => cap(s.trim())).join(' / ')]].filter(r => r[1]);
      $('#tix').innerHTML = `
        <figure class="pcard tix__poster">${media}<figcaption class="mono">${esc(feat.tag ? cap(feat.tag) : 'Momento presents')}</figcaption></figure>
        <div class="tix__info">
          <span class="tag mono">Momento presents</span>
          <h2 class="big tix__name reveal">${esc(featName)}</h2>
          <dl class="tix__rows mono">${rows.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
          <div class="tix__cta mono">
            ${ra ? `<a class="pillbtn pillbtn--solid" href="${esc(ra)}" target="_blank" rel="noopener">${upcoming ? 'Tickets' : 'Event page'} / Resident Advisor ${arrow}</a>` : ''}
            ${eb ? `<a class="pillbtn" href="${esc(eb)}" target="_blank" rel="noopener">Eventbrite ${arrow}</a>` : ''}
          </div>
          ${upcoming ? '' : '<p class="small-text">New dates are announced to the waitlist first. <a href="#waitlist"><u>Join it here.</u></a></p>'}
        </div>`;
    }
    const more = future.slice(1);
    if (more.length) {
      $('#dates').hidden = false;
      $('#datesCount').textContent = `${more.length} ahead`;
      $('#datesList').innerHTML = more.map(e => {
        const u = e.residentAdvisorUrl || e.eventbriteUrl;
        return `<li><a ${u ? `href="${esc(u)}" target="_blank" rel="noopener"` : 'href="#waitlist"'}><span class="mono">${esc(fmt(e.iso, e.date, { day: '2-digit', month: 'short' }))}</span><b>${esc(cleanTitle(e.title))}</b><span class="mono">${esc([cap(e.venue), cap(e.city)].filter(Boolean).join(' / '))}</span><i>${arrow}</i></a></li>`;
      }).join('');
    }

    /* ---------- from the floor ---------- */
    const g = ev.gallery || {};
    if (g.heading) $('#floorHead').textContent = g.heading;
    const items = (g.items || []).filter(i => i && i.media && isVid(i.media));
    const extra = ['r06', 'r23', 'r10', 'r15', 'r20', 'r28', 'r03', 'r13', 'r18', 'r24', 'r05', 'r07'].map(r => ({ media: `assets/video/reel/${r}.mp4`, poster: `assets/video/reel/${r}.jpg` }));
    const pool = [...items, ...extra];
    const half = Math.ceil(pool.length / 2);
    const rowA = pool.slice(0, half).map(i => vidLi(i.media, i.poster)).join(''), rowB = pool.slice(half).map(i => vidLi(i.media, i.poster)).join('');
    $('#reelA').innerHTML = rowA; $('#reelA2').innerHTML = rowA; $('#reelB').innerHTML = rowB; $('#reelB2').innerHTML = rowB;

    /* ---------- line-up ---------- */
    const ar = ev.artists || {};
    const words = (ar.heading || 'Resident sound meets selected artists').split(/\s+/);
    const cut = Math.ceil(words.length / 2);
    $('#artistsHead').innerHTML = `${esc(words.slice(0, cut).join(' '))} <span class="dim">${esc(words.slice(cut).join(' '))}</span>`;
    $('#artistsBody').textContent = [ar.body1, ar.body2].filter(Boolean).join(' ');
    $('#lineupTags').textContent = (ar.tags || []).slice(0, 3).join(' / ');
    $('#lineupList').innerHTML = (ar.residents || []).map(r => {
      const name = r.name === '???' || !r.image ? 'Secret guest' : r.name;
      return `<li><a class="venue"${r.image ? ` data-img="${esc(r.image)}"` : ` data-img="assets/logo-circle.png"`}${r.instagram ? ` href="${esc(r.instagram)}" target="_blank" rel="noopener"` : ''}><span class="venue__name">${esc(name)}</span><span class="venue__meta mono">${esc(cap(r.role))}${r.instagram ? ' / Instagram' : ''}</span></a></li>`;
    }).join('');

    /* ---------- philosophy ---------- */
    const ph = ev.philosophy || {};
    $('#philoHead').innerHTML = `${esc(ph.line1 || '')} <span class="pill"><video poster="assets/video/blue-hour.jpg" src="assets/video/blue-hour.mp4" muted autoplay loop playsinline preload="metadata"></video></span> <span class="dim">${esc(ph.line2 || '')}</span>`;
    $('#philoBody').textContent = ph.body || '';
    $('#pillars').innerHTML = (ph.pillars || []).map(p => `<div><b>${esc(p.title)}</b><span class="small-text">${esc(p.body)}</span></div>`).join('');

    /* ---------- past moments ---------- */
    const archive = [
      ...past.filter(e => e !== feat || upcoming).map(e => ({ title: cleanTitle(e.title), meta: [cap(e.venue), fmt(e.iso, '', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.')].filter(Boolean).join(' / '), image: still(e), url: e.residentAdvisorUrl })),
      ...(ev.pastEvents || []).map(p => ({ title: p.title, meta: cap(p.meta), image: p.image })),
    ].filter(p => p.title);
    $('#pastRail').innerHTML = archive.map(p => `<${p.url ? `a href="${esc(p.url)}" target="_blank" rel="noopener"` : 'article'} class="scard scard--poster">
        ${p.image ? `<img class="pcard__bg" src="${esc(p.image)}" alt="" aria-hidden="true" loading="lazy" draggable="false"><img class="scard__poster" src="${esc(p.image)}" alt="${esc(p.title)} poster" loading="lazy" draggable="false">` : ''}
        <div class="scard__foot"><h3>${esc(p.title)}</h3><p class="mono">${esc(p.meta || '')}</p></div></${p.url ? 'a' : 'article'}>`).join('');

    /* ---------- music ---------- */
    const so = ev.sound || {};
    if (so.tagline) $('#musicTag').textContent = cap(so.tagline);
    $('#musicGenres').textContent = genres.join(' / ');
    if (so.mixUrl) $('#mixLink').href = so.mixUrl; else $('#mixLink').remove();

    /* ---------- footer ---------- */
    $('#footSocial').innerHTML = (site.social || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('')
      + (t.eventbrite ? `<a href="${esc(t.eventbrite)}" target="_blank" rel="noopener">Eventbrite</a>` : '');
    if (site.legal && site.legal.copyright) $('#legalCopy').textContent = site.legal.copyright;

    /* ---------- waitlist ---------- */
    const form = $('#wlForm'), status = $('#wlStatus');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const say = m => { status.hidden = false; status.textContent = m; };
      const url = site.waitlistFormUrl || '';
      if (!url) return say('The waitlist is closed right now. Follow us on Instagram for updates.');
      const btn = form.querySelector('button'); btn.disabled = true;
      try {
        await fetch(url, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(new FormData(form)) });
        form.hidden = true; say('You are on the list. We will be in touch before the next announcement.');
      } catch (err) { btn.disabled = false; say('Something went wrong. Please try again in a moment.'); }
    });

  }
})();
