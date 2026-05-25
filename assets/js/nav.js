/* ============================================================
   SAGE SEDIVEC — nav.js
   Injects shared nav + mobile hamburger + footer into every page.

   Usage in every HTML file:
     <div id="nav-placeholder"></div>   ← top of body
     <div id="footer-placeholder"></div> ← bottom of body
     <script src="/assets/js/nav.js"></script>
   ============================================================ */

/* ── Sage's age — auto-updates every May 1 ──────────────────
   Born May 1, 2012. Age increments each May 1.
   Usage in HTML: <span class="sage-age"></span>
   ---------------------------------------------------------- */
function getSageAge() {
  const now       = new Date();
  const birthYear = 2012;
  const MAY       = 4; // 0-indexed: Jan=0, May=4
  const birthday  = new Date(now.getFullYear(), MAY, 1);
  const age       = now.getFullYear() - birthYear - (now < birthday ? 1 : 0);
  return age;
}

function applyAge() {
  document.querySelectorAll('.sage-age').forEach(el => {
    el.textContent = getSageAge();
  });
}

/* ── Desktop nav ── */
const NAV_HTML = `
<nav>
  <div class="nav-inner">

    <!-- Logo: hidden on desktop, shown on mobile -->
    <a class="nav-logo" href="/index.html">Sage Sedivec</a>

    <!-- Desktop links -->
    <ul class="nav-links">
      <li data-page="home">
        <a href="/index.html">Home</a>
      </li>
      <li data-page="music">
        <a href="/music/index.html">Music <span class="chevron">▾</span></a>
        <div class="dropdown"><div class="dropdown-inner">
          <a href="/music/songs/index.html">Songs</a>
        </div></div>
      </li>
      <li data-page="books">
        <a href="/books/index.html">Books <span class="chevron">▾</span></a>
        <div class="dropdown"><div class="dropdown-inner">
          <a href="/books/the-emerald-jaguar/index.html">The Emerald Jaguar</a>
        </div></div>
      </li>
      <li data-page="blog">
        <a href="/blog/index.html">Blog</a>
      </li>
      <li data-page="events">
        <a href="/events/index.html">Events</a>
      </li>
      <li data-page="support">
        <a href="/support/index.html">Support</a>
      </li>
      <li data-page="about">
        <a href="/about/index.html">About <span class="chevron">▾</span></a>
        <div class="dropdown"><div class="dropdown-inner">
          <a href="/about/contact.html">Contact Me</a>
          <a href="/about/qa.html">Q&amp;A</a>
        </div></div>
      </li>
    </ul>

    <button class="nav-search" aria-label="Search">🔍</button>

    <!-- Hamburger button (mobile only) -->
    <button class="hamburger" aria-label="Open menu" aria-expanded="false" id="hamburger-btn">
      <span></span>
      <span></span>
      <span></span>
    </button>

  </div>
</nav>

<!-- Mobile slide-down menu -->
<div class="mobile-nav" id="mobile-nav" aria-hidden="true">
  <ul>
    <li data-page="home">
      <a href="/index.html">Home</a>
    </li>
    <li data-page="music">
      <a href="/music/index.html">Music</a>
      <ul class="mobile-sub">
        <li><a href="/music/songs/index.html">Songs</a></li>
      </ul>
    </li>
    <li data-page="books">
      <a href="/books/index.html">Books</a>
      <ul class="mobile-sub">
        <li><a href="/books/the-emerald-jaguar/index.html">The Emerald Jaguar</a></li>
      </ul>
    </li>
    <li data-page="blog">
      <a href="/blog/index.html">Blog</a>
    </li>
    <li data-page="events">
      <a href="/events/index.html">Events</a>
    </li>
    <li data-page="support">
      <a href="/support/index.html">Support</a>
    </li>
    <li data-page="about">
      <a href="/about/index.html">About</a>
      <ul class="mobile-sub">
        <li><a href="/about/contact.html">Contact Me</a></li>
        <li><a href="/about/qa.html">Q&amp;A</a></li>
      </ul>
    </li>
  </ul>
</div>
`;

/* ── Footer + newsletter ── */
const FOOTER_HTML = `
<section class="newsletter">
  <h3>Stay in the <span>loop</span> 🎶</h3>
  <p>New music, book updates, and ocean adventures — straight to your inbox.</p>
  <div class="newsletter-form">
    <input type="email" placeholder="your@email.com" aria-label="Email address">
    <button type="button">Subscribe</button>
  </div>
</section>

<footer>
  <span class="footer-logo">Sage Sedivec</span>
  <ul class="footer-links">
    <li><a href="https://www.instagram.com/songs.by.sage" target="_blank" rel="noopener">Instagram</a></li>
    <li><a href="/music/index.html">Music</a></li>
    <li><a href="/books/index.html">Books</a></li>
    <li><a href="/about/contact.html">Contact</a></li>
  </ul>
  <span class="footer-copy">© ${new Date().getFullYear()} Sage Sedivec</span>
</footer>
`;

/* ── Inject nav ── */
const navEl = document.getElementById('nav-placeholder');
if (navEl) navEl.outerHTML = NAV_HTML;

/* ── Inject footer ── */
const footerEl = document.getElementById('footer-placeholder');
if (footerEl) footerEl.outerHTML = FOOTER_HTML;

/* ── Fill age spans ── */
applyAge();

/* ── Mark active nav item ── */
(function markActive() {
  const path = window.location.pathname;
  const map = {
    home:    ['/', '/index.html'],
    music:   ['/music'],
    books:   ['/books'],
    blog:    ['/blog'],
    events:  ['/events'],
    support: ['/support'],
    about:   ['/about'],
  };

  document.querySelectorAll('[data-page]').forEach(li => {
    const key = li.dataset.page;
    const matches = map[key] || [];
    const active = matches.some(m => path === m || path.startsWith(m + '/'));
    if (active) li.classList.add('active');
  });
})();

/* ── Hamburger toggle ── */
(function initHamburger() {
  const btn    = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (!btn || !mobileNav) return;

  btn.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', isOpen);
    mobileNav.setAttribute('aria-hidden', !isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  /* Close menu when a link is tapped */
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', false);
      mobileNav.setAttribute('aria-hidden', true);
      document.body.style.overflow = '';
    });
  });

  /* Close on outside tap */
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !mobileNav.contains(e.target)) {
      mobileNav.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', false);
      document.body.style.overflow = '';
    }
  });
})();

/* ── Newsletter form — proxied via Cloudflare Worker ─────────
   The Worker at WORKER_URL handles the Substack API call
   server-side, bypassing CORS restrictions.
   TODO: after deploying the worker, replace WORKER_URL with
   your actual worker URL from the Cloudflare dashboard.
   ---------------------------------------------------------- */
const WORKER_URL   = 'https://substack-subscribe.petersedivec.workers.dev';
const SUBSTACK_PUB = 'sagesedivec';

async function subscribeToNewsletter(input, btn) {
  const email = input.value.trim();

  if (!email || !email.includes('@')) {
    input.style.borderColor = 'var(--pink-dark)';
    input.focus();
    return;
  }

  const originalText = btn.textContent;
  btn.textContent    = '…';
  btn.disabled       = true;
  input.disabled     = true;

  try {
    const res = await fetch(WORKER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });

    const data = await res.json();

    if (data.success) {
      input.value           = '';
      input.style.borderColor = '';
      btn.textContent       = '✓ Check your email!';
      btn.style.background  = '#1a8f5a';
      setTimeout(() => {
        btn.textContent      = originalText;
        btn.style.background = '';
        btn.disabled         = false;
        input.disabled       = false;
      }, 5000);
    } else {
      throw new Error(data.error || 'Unknown error');
    }

  } catch (err) {
    console.error('Subscribe error:', err);
    // Fallback — open Substack subscribe page
    window.open(
      `https://${SUBSTACK_PUB}.substack.com/subscribe?email=${encodeURIComponent(email)}`,
      '_blank'
    );
    btn.textContent = originalText;
    btn.disabled    = false;
    input.disabled  = false;
  }
}

(function initNewsletter() {
  document.querySelectorAll('.newsletter-form').forEach(form => {
    const btn   = form.querySelector('button');
    const input = form.querySelector('input[type="email"]');
    if (!btn || !input) return;

    btn.addEventListener('click', () => subscribeToNewsletter(input, btn));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') subscribeToNewsletter(input, btn);
    });
    input.addEventListener('input', () => {
      input.style.borderColor = '';
    });
  });
})();