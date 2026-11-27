/* MOMENTO main site. All content comes from content/*.json (edited in the CMS at /admin). */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isVid = p => /\.(mp4|webm|mov)$/i.test(p || '');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Title-case text typed in ALL CAPS; leave mixed-case text exactly as the editor wrote it.
  const cap = s => {
    s = String(s || '').trim();
    if (s !== s.toUpperCase()) return s;
    return s.toLowerCase().replace(/(^|[\s(\[/-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase())
      .replace(/\b(Dj|Djs|B2b|Ldn|Gb|Uk|Lfw|Mj|Haz)\b/g, w => w.toUpperCase()).replace(/\b([A-Z][a-z]?\d\w*)\b/g, w => w.toUpperCase());
  };
  // "MOMENTO PRESENTS: WINTER 99" -> "Winter 99" (the lockup already says Momento presents)
  const cleanTitle = t => cap(String(t || '').replace(/^\s*momento\s+presents\s*:\s*/i, '').trim());

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const menuBtn = $('.nav__menu'), drawer = $('#drawer');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    drawer.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  drawer.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- reveal + play videos only on screen ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) en.target.classList.add('in');
  }), { rootMargin: '0px 0px -10% 0px' }) : null;
  const vio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => {
    const v = en.target;
    if (en.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { rootMargin: '200px 0px' }) : null;
  const watch = root => {
    root.querySelectorAll('.rv').forEach(el => io ? io.observe(el) : el.classList.add('in'));
    root.querySelectorAll('video[data-auto]').forEach(v => vio ? vio.observe(v) : v.play().catch(() => {}));
  };
  const vid = (src, poster, cls = '') => `<video ${cls ? `class="${cls}"` : ''} src="${esc(src)}"${poster ? ` poster="${esc(poster)}"` : ''} muted loop playsinline preload="none" data-auto></video>`;

  /* ---------- dates: same rules as before, so the CMS works the same way ---------- */
  const todayISO = new Date().toISOString().slice(0, 10);
  const parseDisplay = s => {
    let m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(s || ''); if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = /(\d{2})\.(\d{2})\.(\d{2})(?!\d)/.exec(s || ''); return m ? `20${m[3]}-${m[2]}-${m[1]}` : '';
  };
  const fmtDate = (iso, fallback) => {
    if (!iso) return fallback || 'TBA';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };
  const still = e => isVid(e.poster) ? (e.posterImage || '') : (e.poster || e.posterImage || '');

  Promise.all([
    fetch('content/site.json').then(r => r.json()),
    fetch('content/events.json').then(r => r.json()),
  ]).then(([site, ev]) => render(site || {}, ev || {})).catch(err => console.warn('content load failed', err));

  function render(site, ev) {
    const t = site.ticketLinks || {};

    /* hero */
    const hero = ev.hero || {};
    if (hero.headline) {
      const words = hero.headline.trim().split(/\s+/);
      const last = words.pop();
      $('#heroHeadline').innerHTML = `${esc(words.join(' '))} <em>${esc(last)}</em>`;
    }
    if (hero.subtext) $('#heroSub').textContent = hero.subtext;
    if (hero.location) $('#heroLoc').textContent = hero.location;
    const clips = (hero.videos || []).filter(v => v && v.video);
    if (clips.length) {
      const box = $('#heroMedia'), dots = $('#heroDots');
      box.innerHTML = clips.map((c, i) => `<video src="${esc(c.video)}"${c.poster ? ` poster="${esc(c.poster)}"` : ''} muted playsinline preload="${i ? 'none' : 'auto'}"${i ? '' : ' autoplay'}></video>`).join('');
      dots.innerHTML = clips.length > 1 ? clips.map(() => '<i></i>').join('') : '';
      const vs = [...box.querySelectorAll('video')], ds = [...dots.children];
      let k = 0;
      const show = i => {
        vs.forEach((v, j) => { v.classList.toggle('on', j === i); if (j !== i) v.pause(); });
        ds.forEach((d, j) => d.classList.toggle('on', j === i));
        const v = vs[i]; v.preload = 'auto'; v.currentTime = 0; v.play().catch(() => {});
        const nx = vs[(i + 1) % vs.length]; if (nx && nx.preload === 'none') nx.preload = 'metadata';
      };
      vs.forEach(v => v.addEventListener('ended', () => { k = (k + 1) % vs.length; show(k); }));
      // a single clip, or reduced motion: just loop the first one
      if (vs.length === 1 || reduce) vs[0].loop = true;
      show(0);
    }

    /* events: soonest upcoming is featured; if none, the latest past one */
    const all = (ev.events || []).map(e => ({ ...e, iso: e.dateISO || parseDisplay(e.date) }));
    const future = all.filter(e => !e.iso || e.iso >= todayISO)
      .sort((a, b) => !a.iso ? 1 : !b.iso ? -1 : a.iso.localeCompare(b.iso));
    const past = all.filter(e => e.iso && e.iso < todayISO).sort((a, b) => b.iso.localeCompare(a.iso));
    const feat = future[0] || past[0];
    const upcoming = !!future[0];
    $('#eventLabel').textContent = upcoming ? 'Next moment' : 'Latest moment';
    if (feat) {
      const name = cleanTitle(feat.title);
      const ra = feat.residentAdvisorUrl || '', eb = feat.eventbriteUrl || '';
      const media = isVid(feat.poster) ? vid(feat.poster, feat.posterImage) : (still(feat) ? `<img src="${esc(still(feat))}" alt="${esc(name)} poster">` : '<span class="h3">TBA</span>');
      const rows = [
        ['Date', fmtDate(feat.iso, feat.date)], ['Time', feat.time], ['Venue', [cap(feat.venue), cap(feat.city)].filter(Boolean).join(', ')],
        [cap(feat.soundLabel) || 'Sound', (feat.sound || []).map(s => cap(s.trim())).join(' · ')],
      ].filter(r => r[1]);
      $('#event').innerHTML = `
        <div class="frame rv">${media}</div>
        <div class="rv">
          <div class="event__presents mono"><img src="assets/logo-circle.png" alt="">Momento presents</div>
          <h2 class="display event__title">${esc(name)}</h2>
          <dl class="facts mono">${rows.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
          <div class="event__cta">
            ${ra ? `<a class="btn btn--solid" href="${esc(ra)}" target="_blank" rel="noopener">${upcoming ? 'Tickets on' : 'View on'} Resident Advisor <span class="arrow">↗</span></a>` : ''}
            ${eb ? `<a class="btn" href="${esc(eb)}" target="_blank" rel="noopener">Eventbrite <span class="arrow">↗</span></a>` : ''}
          </div>
        </div>`;
      // header ticket buttons go to the featured event when it is still ahead
      const tix = upcoming && (ra || eb) ? (ra || eb) : (t.residentAdvisor || '#events');
      document.querySelectorAll('[data-tix]').forEach(a => { a.href = tix; if (/^http/.test(tix)) { a.target = '_blank'; a.rel = 'noopener'; } });
      const nc = $('#nextCard');
      nc.innerHTML = `<div class="next__img">${still(feat) ? `<img src="${esc(still(feat))}" alt="">` : ''}</div>
        <div class="next__body"><span class="mono">${upcoming ? 'Next moment' : 'Latest moment'}</span><strong>${esc(name)}</strong><small>${esc(fmtDate(feat.iso, feat.date))} · ${esc(cap(feat.venue))}</small></div>`;
      nc.hidden = false;
    }
    const more = future.slice(1);
    if (more.length) {
      $('#future').hidden = false;
      $('#futureList').innerHTML = more.map(e => `<li><a href="${esc(e.residentAdvisorUrl || e.eventbriteUrl || '#events')}"${e.residentAdvisorUrl || e.eventbriteUrl ? ' target="_blank" rel="noopener"' : ''}>
        ${still(e) ? `<img src="${esc(still(e))}" alt="">` : '<span></span>'}
        <span><strong>${esc(cleanTitle(e.title))}</strong><span class="mono" style="color:var(--mut)">${esc([cap(e.venue), cap(e.city)].filter(Boolean).join(', '))}</span></span>
        <span class="mono">${esc(fmtDate(e.iso, e.date))}</span></a></li>`).join('');
    }

    /* past moments: finished events first, then the hand-made archive list */
    const archive = [
      ...past.filter(e => e !== feat).map(e => ({ title: cleanTitle(e.title), meta: [cap(e.venue), cap(e.city), fmtDate(e.iso)].filter(Boolean).join(' · '), image: still(e), url: e.residentAdvisorUrl })),
      ...(ev.pastEvents || []).map(p => ({ title: p.title, meta: cap(p.meta), image: p.image })),
    ].filter(p => p.title);
    $('#pastCount').textContent = `${archive.length + (feat && !upcoming ? 1 : 0)} nights`;
    const LIMIT = 8;
    $('#pastGrid').innerHTML = archive.map((p, i) => {
      const inner = `<div class="frame">${p.image ? (isVid(p.image) ? vid(p.image) : `<img src="${esc(p.image)}" alt="${esc(p.title)} poster" loading="lazy">`) : '<span class="h3">Momento</span>'}</div>
        <div class="past__cap"><strong>${esc(p.title)}</strong>${p.meta ? `<span class="mono">${esc(p.meta)}</span>` : ''}</div>`;
      return `<${p.url ? `a href="${esc(p.url)}" target="_blank" rel="noopener"` : 'div'} class="past__item rv"${i >= LIMIT ? ' hidden' : ''}>${inner}</${p.url ? 'a' : 'div'}>`;
    }).join('');
    if (archive.length > LIMIT) {
      const m = $('#pastMore'); m.hidden = false;
      m.querySelector('button').addEventListener('click', () => { document.querySelectorAll('#pastGrid [hidden]').forEach(el => { el.hidden = false; el.classList.add('in'); }); m.hidden = true; });
    }

    /* marquee of event names */
    const names = [...new Set([...future, ...past].map(e => cleanTitle(e.title)).concat((ev.pastEvents || []).map(p => p.title)).filter(Boolean))];
    if (names.length) {
      const run = names.map(n => `<span>${esc(n)}</span>`).join('');
      $('#band').innerHTML = run + run;
    }

    /* philosophy */
    const ph = ev.philosophy || {};
    if (ph.line1 || ph.line2) $('#philoHead').innerHTML = `${esc(ph.line1 || '')} <em>${esc(ph.line2 || '')}</em>`;
    $('#philoBody').textContent = ph.body || '';
    $('#pillars').innerHTML = (ph.pillars || []).map(p => `<div class="rv"><strong>${esc(p.title)}</strong><p>${esc(p.body)}</p></div>`).join('');
    if (!(ph.pillars || []).length) $('#pillars').remove();

    /* music */
    const so = ev.sound || {};
    if (so.tagline) {
      const w = so.tagline.split(/\s+/);
      $('#musicHead').innerHTML = w.map((x, i) => i === 1 ? `<em>${esc(cap(x))}</em>` : esc(cap(x))).join(' ');
    }
    $('#musicBody').textContent = so.body || '';
    const mv = (so.videos || [])[0];
    if (mv && mv.video) $('#musicVideo').innerHTML = vid(mv.video, mv.poster); else $('#musicVideo').remove();
    if (so.mixUrl) {
      $('#player').innerHTML = `<iframe title="Momento mix on SoundCloud" loading="lazy" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(so.mixUrl)}&color=%23b87958&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false"></iframe>`;
    } else $('#player').remove();
    const genres = ((site.brand && site.brand.genres) || '').split('/').map(s => s.trim()).filter(Boolean);
    $('#genres').innerHTML = genres.map(g => `<span>${esc(g)}</span>`).join('');

    /* from the floor */
    const g = ev.gallery || {};
    if (g.heading) {
      const w = g.heading.trim().split(/\s+/), last = w.pop();
      $('#floorHead').innerHTML = `${esc(w.join(' '))} <em>${esc(last)}</em>`;
    }
    const items = (g.items || []).filter(i => i && i.media);
    if (items.length) {
      $('#floorGrid').innerHTML = items.map(i => `<figure class="tile ${esc(i.size || 'square')} rv">${isVid(i.media) ? vid(i.media, i.poster) : `<img src="${esc(i.media)}" alt="${esc(i.caption || 'Momento night')}" loading="lazy">`}${i.caption ? `<figcaption class="mono">${esc(i.caption)}</figcaption>` : ''}</figure>`).join('');
    } else $('#floor').remove();

    /* artists */
    const ar = ev.artists || {};
    $('#artistsHead').innerHTML = (() => { const w = (ar.heading || 'Resident sound').split(/\s+/); const l = w.splice(-2).join(' '); return `${esc(w.join(' '))} <em>${esc(l)}</em>`; })();
    $('#artistsBody1').textContent = ar.body1 || '';
    $('#artistsBody2').textContent = ar.body2 || '';
    $('#artistsTags').innerHTML = (ar.tags || []).map(x => `<span>${esc(x)}</span>`).join('');
    const ppl = ar.residents || [];
    $('#people').style.setProperty('--n', Math.max(1, Math.min(ppl.length, 3)));
    $('#people').innerHTML = ppl.map(r => r.image
      ? `<a class="person" href="${esc(r.instagram || '#artists')}"${r.instagram ? ' target="_blank" rel="noopener"' : ''}><img src="${esc(r.image)}" alt="${esc(r.name)}" loading="lazy" style="object-position:${esc(r.focus || '50% 30%')}"><div class="person__cap"><strong>${esc(r.name)}</strong><span class="mono">${esc(r.role)}${r.instagram ? '<br>Instagram ↗' : ''}</span></div></a>`
      : `<div class="person person--secret"><span class="q">?</span><div class="person__cap"><strong>${esc(r.name === '???' ? 'Secret guest' : r.name)}</strong><span class="mono">${esc(r.role)}</span></div></div>`).join('');

    /* footer */
    $('#footSocial').innerHTML = (site.social || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join('')
      + (t.eventbrite ? `<a href="${esc(t.eventbrite)}" target="_blank" rel="noopener">Eventbrite ↗</a>` : '');
    const lg = site.legal || {};
    if (lg.copyright) $('#legalCopy').textContent = lg.copyright;
    if (lg.credit) $('#legalCredit').textContent = lg.credit;

    /* waitlist */
    const form = $('#wlForm'), status = $('#wlStatus');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const url = site.waitlistFormUrl || '';
      const btn = form.querySelector('button');
      const say = (msg, ok) => { status.hidden = false; status.textContent = msg; status.style.color = ok ? '' : 'var(--terra)'; };
      if (!url) return say('The waitlist is not open right now. Please follow us on Instagram for updates.', false);
      btn.disabled = true; btn.textContent = 'Joining...';
      try {
        await fetch(url, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(new FormData(form)) });
        form.hidden = true;
        say('You are on the list. We will be in touch before the next announcement.', true);
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Join the waitlist';
        say('Something went wrong. Please try again in a moment.', false);
      }
    });

    watch(document);
  }

  watch(document);
})();
