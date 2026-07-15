<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import TextField from '$lib/components/ui/TextField.svelte'
  let { data } = $props()
  const hasFilters = () =>
    Object.keys(data.filters).some((key) => key !== 'page')
  const pageHref = (page: number) => {
    const params = new URLSearchParams(data.filters)
    params.set('page', String(page))
    return `?${params}`
  }
</script>

<header class="page-title">
  <div>
    <p class="eyebrow">AUDIT</p>
    <h1>Audit logs</h1>
  </div>
</header>
<form class="filters data-panel" method="GET">
  <div class="filter-field">
    <TextField
      id="domain"
      label="Domain"
      name="domain"
      value={data.filters.domain ?? ''}
    />
  </div>
  <div class="filter-field">
    <label
      >Status<select name="status" value={data.filters.status ?? ''}
        ><option value="">Semua hasil</option><option>SUCCESS</option><option
          >ERR_LICENSE_NOT_FOUND</option
        ><option>ERR_LICENSE_REVOKED</option><option>ERR_LICENSE_EXPIRED</option
        ></select
      ></label
    >
  </div>
  <div class="filter-field">
    <TextField
      id="date-from"
      label="Dari tanggal"
      name="date_from"
      type="date"
      value={data.filters.date_from ?? ''}
    />
  </div>
  <div class="filter-field">
    <TextField
      id="date-to"
      label="Sampai tanggal"
      name="date_to"
      type="date"
      value={data.filters.date_to ?? ''}
    />
  </div>
  <Button type="submit">Terapkan filter</Button>{#if hasFilters()}<a
      class="reset"
      href="/dashboard/audit-logs">Reset filter</a
    >{/if}
</form>
{#if data.logs.items.length}<div class="table-scroll data-panel">
    <table>
      <caption>Log verifikasi</caption><thead
        ><tr
          ><th>Waktu</th><th>Fingerprint</th><th>Domain/path</th><th>IP</th><th
            >Hasil</th
          ></tr
        ></thead
      ><tbody
        >{#each data.logs.items as log}<tr
            ><td>{new Date(log.created_at).toLocaleString('id-ID')}</td><td
              ><code>{log.license_key_fingerprint}</code></td
            ><td>{log.request_host}{log.request_path}</td><td
              >{log.request_ip}</td
            ><td><Badge value={log.status_result} /></td></tr
          >{/each}</tbody
      >
    </table>
  </div>{:else}<p class="empty">
    {hasFilters()
      ? 'Tidak ada log yang cocok dengan filter'
      : 'Belum ada log verifikasi.'}
  </p>{/if}
{#if data.logs.total_pages > 1}<nav aria-label="Pagination">
    {#if data.logs.page > 1}<a href={pageHref(data.logs.page - 1)}>Sebelumnya</a
      >{/if}<span aria-current="page"
      >Halaman {data.logs.page} dari {data.logs.total_pages}</span
    >{#if data.logs.page < data.logs.total_pages}<a
        href={pageHref(data.logs.page + 1)}>Berikutnya</a
      >{/if}
  </nav>{/if}

<style>
  h1,
  p {
    margin: 0;
  }
  .eyebrow {
    font-size: 0.8rem;
    font-weight: 900;
    letter-spacing: 0.08em;
  }
  .filters {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) minmax(180px, 0.7fr) repeat(2, minmax(150px, 0.55fr))
      auto;
    gap: 1rem;
    align-items: end;
    margin: 2rem 0;
  }
  .data-panel {
    border: var(--border);
    border-radius: 10px;
    background: var(--white);
  }
  form.data-panel {
    padding: 1rem;
  }
  .filter-field {
    min-width: 0;
  }
  .filters :global(button) {
    min-width: 170px;
  }
  select {
    display: block;
    width: 100%;
    min-height: 44px;
    border: var(--border);
    border-radius: 8px;
    background: var(--white);
    padding: 0.5rem;
  }
  .reset {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
  .table-scroll {
    overflow-x: auto;
    border: var(--border);
    border-radius: 10px;
    background: var(--white);
    box-shadow: var(--shadow-sm);
  }
  table {
    width: 100%;
    min-width: 800px;
    border-collapse: collapse;
  }
  th,
  td {
    border-bottom: 1px solid var(--ink);
    padding: 0.75rem;
    text-align: left;
  }
  .empty {
    border: var(--border);
    border-radius: 10px;
    background: var(--white);
    padding: 1rem;
  }
  nav {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  nav a,
  nav span {
    min-height: 44px;
    display: grid;
    place-items: center;
    border: var(--border);
    border-radius: 8px;
    background: var(--white);
    padding: 0.5rem 0.75rem;
  }
  @media (max-width: 900px) {
    .filters {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 600px) {
    .filters {
      grid-template-columns: 1fr;
    }
  }
</style>
