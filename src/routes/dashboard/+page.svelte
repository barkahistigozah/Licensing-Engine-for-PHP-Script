<script lang="ts">
  let { data } = $props()
</script>

<svelte:head><title>Dashboard — LEPS</title></svelte:head>
<header class="page-title">
  <div>
    <p class="eyebrow">CONTROL ROOM</p>
    <h1>Ringkasan sistem.</h1>
  </div>
  <a href="/dashboard/licenses">+ Buat license</a>
</header>
<section class="metrics">
  <article>
    <strong>{data.stats.active_licenses}</strong><span>License aktif</span>
  </article>
  <article>
    <strong>{data.stats.expiring_soon}</strong><span>Akan kedaluwarsa</span>
  </article>
  <article>
    <strong>{data.stats.verification_total_24h}</strong><span
      >Verifikasi 24 jam</span
    >
  </article>
  <article class="critical">
    <strong>{data.stats.verification_failed_24h}</strong><span
      >Gagal 24 jam</span
    >
  </article>
</section>
<section class="overview-panel">
  <h2>License terbaru</h2>
  {#if data.stats.recent_licenses.length}<div class="table-scroll">
      <table>
        <caption>License terbaru</caption><thead
          ><tr><th>Key</th><th>Domain</th><th>Status</th></tr></thead
        ><tbody
          >{#each data.stats.recent_licenses as license}<tr
              ><td><code>{license.license_key}</code></td><td
                >{license.allowed_domain}</td
              ><td>{license.status}</td></tr
            >{/each}</tbody
        >
      </table>
    </div>{:else}<p class="empty">Belum ada license.</p>{/if}
</section>
<section class="overview-panel">
  <h2>Verifikasi terbaru</h2>
  {#if data.stats.recent_verifications.length}<div class="table-scroll">
      <table>
        <caption>Aktivitas verifikasi terbaru</caption><thead
          ><tr><th>Waktu</th><th>Domain/path</th><th>Hasil</th></tr></thead
        ><tbody
          >{#each data.stats.recent_verifications as log}<tr
              ><td>{new Date(log.created_at).toLocaleString('id-ID')}</td><td
                >{log.request_host}{log.request_path}</td
              ><td>{log.status_result}</td></tr
            >{/each}</tbody
        >
      </table>
    </div>{:else}<p class="empty">Belum ada aktivitas verifikasi.</p>{/if}
</section>

<style>
  .page-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .eyebrow {
    margin: 0;
    color: var(--red);
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.1em;
  }
  h1,
  h2,
  p {
    margin: 0;
  }
  h1 {
    font-size: clamp(2rem, 4vw, 2.8rem);
    letter-spacing: -0.05em;
  }
  .page-title a {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    border: var(--border);
    border-radius: 8px;
    background: var(--red);
    box-shadow: var(--shadow-sm);
    padding: 0.6rem 1rem;
    color: var(--white);
    font-weight: 900;
    text-decoration: none;
    text-transform: uppercase;
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 2rem 0;
  }
  .metrics article {
    display: grid;
    gap: 0.25rem;
    border: var(--border);
    border-radius: 9px;
    background: var(--sand);
    padding: 1rem;
  }
  .metrics article:nth-child(2) {
    background: var(--white);
  }
  .metrics .critical {
    background: var(--red);
    color: var(--white);
  }
  article strong {
    font-size: 2rem;
    line-height: 1;
  }
  .metrics span {
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
  }
  .overview-panel {
    overflow: hidden;
    margin-top: 1.5rem;
    border: var(--border);
    border-radius: 10px;
    background: var(--white);
  }
  .overview-panel h2 {
    border-bottom: var(--border);
    background: var(--sand);
    padding: 0.8rem 1rem;
    font-size: 0.85rem;
    text-transform: uppercase;
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    min-width: 560px;
    border-collapse: collapse;
  }
  th,
  td {
    border-bottom: 1px solid var(--ink);
    padding: 0.75rem 1rem;
    text-align: left;
  }
  caption {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  .empty {
    padding: 1rem;
  }
  @media (max-width: 900px) {
    .metrics {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 600px) {
    .page-title {
      align-items: flex-start;
      flex-direction: column;
    }
    .metrics {
      grid-template-columns: 1fr;
    }
  }
</style>
