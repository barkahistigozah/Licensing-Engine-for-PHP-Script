<svelte:head>
  <title>LEPS — Licensing Engine untuk Script PHP</title>
  <meta
    name="description"
    content="Kelola dan verifikasi lisensi script PHP berdasarkan domain, path, dan Telegram binding."
  />
</svelte:head>

<main class="product-frame">
  <div class="browser-dots" aria-hidden="true"><i></i><i></i><i></i></div>
  <header class="site-header">
    <a class="wordmark" href="/">LEPS</a>
    <nav aria-label="Navigasi utama">
      <a href="#how-it-works">Cara kerja</a><a href="#security">Keamanan</a><a
        class="login"
        href="/login">Login admin</a
      >
    </nav>
  </header>
  <section class="hero">
    <p class="eyebrow">LICENSING ENGINE UNTUK SCRIPT PHP</p>
    <h1>Kirim kode Anda.<br />Tetap pegang kendali.</h1>
    <p>
      Kelola lisensi berdasarkan domain, path instalasi, dan Telegram binding
      melalui satu API yang jelas.
    </p>
    <div class="hero-actions">
      <a class="primary" href="#how-it-works">Lihat cara kerjanya</a>
      <a class="secondary" href="/login">Lihat API</a>
    </div>
  </section>
  <section id="how-it-works">
    <h2>Tiga langkah. Tanpa drama.</h2>
    <ol class="steps">
      <li>Buat license</li>
      <li>Verifikasi instalasi</li>
      <li>Izinkan atau blokir</li>
    </ol>
  </section>
  <section id="features">
    <h2>Kontrol yang memang dibutuhkan</h2>
    <ul class="feature-grid">
      <li>Domain dan path binding</li>
      <li>Rate limit dan verifikasi database terbaru</li>
      <li>Audit setiap percobaan</li>
      <li>Suspend dan expiry</li>
    </ul>
  </section>
  <section id="security" class="security-panel">
    <h2>Secret tidak diperlakukan sebagai teks biasa.</h2>
    <p>
      Telegram token disimpan sebagai keyed hash dan response valid
      ditandatangani dengan Ed25519.
    </p>
  </section>
  <section class="final-cta">
    <h2>Masuk ke control room.</h2>
    <a class="primary" href="/login">Masuk ke admin</a>
  </section>
</main>

<style>
  .product-frame {
    width: min(100% - 2rem, 1160px);
    margin: 1rem auto;
    overflow: hidden;
    border: var(--border);
    border-radius: 12px;
    background: var(--white);
    box-shadow: var(--shadow-md);
  }
  .browser-dots {
    display: flex;
    gap: 0.45rem;
    padding: 0.6rem 1rem;
    border-bottom: var(--border);
    background: var(--paper);
  }
  .browser-dots i {
    width: 11px;
    height: 11px;
    border: 1px solid var(--ink);
    border-radius: 50%;
    background: var(--red);
  }
  .browser-dots i:nth-child(2) {
    background: var(--sand);
  }
  .browser-dots i:nth-child(3) {
    background: var(--green);
  }
  .site-header {
    min-height: 76px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0 1rem;
    border-bottom: var(--border);
  }
  .wordmark {
    border: var(--border);
    border-radius: 6px;
    background: var(--green);
    padding: 0.4rem 0.6rem;
    color: var(--white);
    font-size: 0.85rem;
    font-weight: 900;
    text-decoration: none;
  }
  nav,
  .hero-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  nav a {
    font-size: 0.82rem;
    font-weight: 900;
    text-decoration: none;
    text-transform: uppercase;
  }
  .login,
  .primary,
  .secondary {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    border: var(--border);
    border-radius: 8px;
    padding: 0.6rem 1rem;
    font-weight: 900;
    text-decoration: none;
    text-transform: uppercase;
  }
  .login,
  .primary {
    background: var(--red);
    box-shadow: var(--shadow-sm);
    color: var(--white);
  }
  .secondary {
    background: var(--white);
    box-shadow: var(--shadow-sm);
  }
  section {
    padding: clamp(2.5rem, 7vw, 5.5rem) clamp(1rem, 5vw, 4rem);
  }
  .hero {
    display: grid;
    gap: 1.1rem;
    min-height: 440px;
    align-content: center;
  }
  .eyebrow {
    margin: 0;
    color: var(--red);
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.1em;
  }
  .hero h1 {
    max-width: 800px;
    margin: 0;
    font-size: clamp(2.5rem, 7vw, 5.3rem);
    line-height: 0.92;
    letter-spacing: -0.07em;
  }
  .hero > p:not(.eyebrow) {
    max-width: 680px;
    margin: 0;
    line-height: 1.6;
  }
  h2 {
    margin: 0 0 1.25rem;
    font-size: clamp(1.5rem, 3vw, 2rem);
    text-transform: uppercase;
  }
  .steps,
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .steps li {
    display: grid;
    min-height: 76px;
    place-items: center;
    border: var(--border);
    border-radius: 9px;
    background: var(--white);
    padding: 1rem;
    font-size: 0.82rem;
    font-weight: 900;
    text-align: center;
    text-transform: uppercase;
  }
  .steps li:not(:last-child)::after {
    content: '→';
    position: absolute;
    color: var(--red);
    transform: translateX(calc(50vw / 3));
  }
  .feature-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .feature-grid li,
  .security-panel,
  .final-cta {
    border: var(--border);
    border-radius: 10px;
    background: var(--sand);
    padding: 1rem;
    font-weight: 800;
  }
  .security-panel {
    margin: 0 clamp(1rem, 5vw, 4rem) 3rem;
    padding: 1.5rem;
  }
  .security-panel h2,
  .security-panel p {
    margin: 0;
  }
  .security-panel p {
    margin-top: 0.6rem;
    line-height: 1.6;
  }
  .final-cta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin: 0 clamp(1rem, 5vw, 4rem) 2rem;
  }
  .final-cta h2 {
    margin: 0;
  }
  @media (max-width: 767px) {
    .product-frame {
      width: calc(100% - 1rem);
      margin: 0.5rem auto;
    }
    .site-header {
      align-items: flex-start;
      padding: 1rem;
    }
    .site-header nav a:not(.login) {
      display: none;
    }
    .steps,
    .feature-grid {
      grid-template-columns: 1fr;
    }
    .steps li:not(:last-child)::after {
      display: none;
    }
    .security-panel,
    .final-cta {
      margin: 0 1rem 1.5rem;
    }
    .final-cta {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
