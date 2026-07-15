<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import Badge from '$lib/components/ui/Badge.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import InlineAlert from '$lib/components/ui/InlineAlert.svelte'
  import Modal from '$lib/components/ui/Modal.svelte'
  import TextField from '$lib/components/ui/TextField.svelte'

  type License = {
    id: string
    license_key: string
    allowed_domain: string
    allowed_path: string
    telegram_chat_id: string
    status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED'
    expires_at: string
  }

  let { data } = $props()
  let open = $state(false)
  let busy = $state(false)
  let message = $state('')
  let editing = $state<License>()
  let confirm = $state<{
    action: 'extend' | 'delete'
    license: License
  }>()
  let confirmOpen = $state(false)
  let domain = $state('')
  let path = $state('/')
  let token = $state('')
  let chatId = $state('')
  let status = $state<'ACTIVE' | 'SUSPENDED'>('ACTIVE')
  let expiresAt = $state('')
  let days = $state('14')

  const dateInput = (value: string) => value.slice(0, 10)
  const pageHref = (page: number) => {
    const params = new URLSearchParams(data.filters)
    params.set('page', String(page))
    return `?${params}`
  }

  function resetForm() {
    editing = undefined
    domain = ''
    path = '/'
    token = ''
    chatId = ''
    status = 'ACTIVE'
    expiresAt = ''
  }

  function startEdit(license: License) {
    editing = license
    domain = license.allowed_domain
    path = license.allowed_path
    token = ''
    chatId = license.telegram_chat_id
    status = license.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'
    expiresAt = dateInput(license.expires_at)
    open = true
  }

  async function request(pathname: string, method: string, body?: unknown) {
    busy = true
    message = ''
    try {
      const response = await fetch(pathname, {
        method,
        credentials: 'include',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      })
      if (!response.ok) throw new Error()
      await invalidateAll()
      return true
    } catch {
      message = 'Perubahan tidak dapat disimpan. Coba lagi.'
      return false
    } finally {
      busy = false
    }
  }

  async function save() {
    const body = {
      allowed_domain: domain,
      allowed_path: path,
      telegram_chat_id: chatId,
      status,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
      ...(!editing || token ? { telegram_bot_token: token } : {})
    }
    if (
      await request(
        editing ? `/api/admin/licenses/${editing.id}` : '/api/admin/licenses',
        editing ? 'PATCH' : 'POST',
        body
      )
    ) {
      open = false
      resetForm()
      message = editing ? 'License diperbarui.' : 'License dibuat.'
    }
  }

  async function setStatus(license: License, next: 'ACTIVE' | 'SUSPENDED') {
    if (
      await request(`/api/admin/licenses/${license.id}`, 'PATCH', {
        status: next
      })
    )
      message =
        next === 'ACTIVE' ? 'License diaktifkan.' : 'License ditangguhkan.'
  }

  function ask(action: 'extend' | 'delete', license: License) {
    confirm = { action, license }
    confirmOpen = true
  }

  async function runConfirmed() {
    if (!confirm) return
    const { action, license } = confirm
    const ok = await request(
      action === 'extend'
        ? `/api/admin/licenses/${license.id}/extend`
        : `/api/admin/licenses/${license.id}`,
      action === 'delete' ? 'DELETE' : 'POST',
      action === 'extend' ? { days: Number(days) } : undefined
    )
    if (ok) {
      message =
        action === 'delete' ? 'License dihapus.' : 'Masa berlaku diperpanjang.'
      confirmOpen = false
    }
  }

  async function copyKey(license: License) {
    try {
      await navigator.clipboard.writeText(license.license_key)
      message = 'License key disalin.'
    } catch {
      message = 'License key tidak dapat disalin.'
    }
  }
</script>

<header class="page-title">
  <div>
    <p class="eyebrow">LICENSES</p>
    <h1>License management</h1>
  </div>
  <button
    class="create"
    onclick={() => {
      resetForm()
      open = true
    }}>Buat license</button
  >
</header>
{#if message}<InlineAlert>{message}</InlineAlert>{/if}
<form class="filters data-panel" method="GET">
  <div class="filter-field">
    <TextField
      id="search"
      label="Cari domain atau key"
      value={data.filters.search ?? ''}
      name="search"
    />
  </div>
  <div class="filter-field">
    <label
      >Status<select name="status" value={data.filters.status ?? ''}
        ><option value="">Semua status</option><option>ACTIVE</option><option
          >SUSPENDED</option
        ><option>EXPIRED</option></select
      ></label
    >
  </div>
  <Button type="submit">Terapkan filter</Button>
</form>
{#if data.licenses.items.length}<div class="table-scroll data-panel">
    <table>
      <caption>Daftar license</caption><thead
        ><tr
          ><th>Key</th><th>Domain</th><th>Path</th><th>Status</th><th
            >Kedaluwarsa</th
          ><th>Aksi</th></tr
        ></thead
      ><tbody
        >{#each data.licenses.items as license}<tr
            ><td
              ><code>{license.license_key}</code><button
                class="link"
                onclick={() => copyKey(license)}>Salin key</button
              ></td
            ><td>{license.allowed_domain}</td><td>{license.allowed_path}</td><td
              ><Badge value={license.status} /></td
            ><td>{new Date(license.expires_at).toLocaleDateString('id-ID')}</td
            ><td class="actions"
              ><button onclick={() => startEdit(license)}>Edit license</button
              >{#if license.status === 'SUSPENDED'}<button
                  onclick={() => setStatus(license, 'ACTIVE')}>Activate</button
                >{:else}<button onclick={() => setStatus(license, 'SUSPENDED')}
                  >Suspend</button
                >{/if}<button onclick={() => ask('extend', license)}
                >Perpanjang</button
              ><button class="danger" onclick={() => ask('delete', license)}
                >Hapus license</button
              ></td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>{:else}<p class="empty">
    Belum ada license. Buat license pertama untuk memulai.
  </p>{/if}
{#if data.licenses.total_pages > 1}<nav aria-label="Pagination">
    {#if data.licenses.page > 1}<a href={pageHref(data.licenses.page - 1)}
        >Sebelumnya</a
      >{/if}<span aria-current="page"
      >Halaman {data.licenses.page} dari {data.licenses.total_pages}</span
    >{#if data.licenses.page < data.licenses.total_pages}<a
        href={pageHref(data.licenses.page + 1)}>Berikutnya</a
      >{/if}
  </nav>{/if}
<Modal title={editing ? 'Edit license' : 'Buat license'} bind:open
  ><form
    class="form"
    onsubmit={(event) => {
      event.preventDefault()
      save()
    }}
  >
    <TextField
      id="domain"
      label="Domain"
      bind:value={domain}
      required
    /><TextField
      id="path"
      label="Path instalasi"
      bind:value={path}
      required
    /><TextField
      id="chat-id"
      label="Telegram chat ID"
      bind:value={chatId}
      required
    /><label
      >Status<select bind:value={status}
        ><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED"
          >SUSPENDED</option
        ></select
      ></label
    ><TextField
      id="expires-at"
      label="Kedaluwarsa"
      type="date"
      bind:value={expiresAt}
    /><TextField
      id="token"
      label="Telegram bot token"
      type="password"
      bind:value={token}
      required={!editing}
      hint={editing
        ? 'Kosongkan untuk mempertahankan token tersimpan; token lama tidak dapat ditampilkan.'
        : 'Telegram bot token tersimpan tidak dapat ditampilkan kembali'}
    /><Button type="submit" {busy}
      >{busy ? 'Menyimpan…' : 'Simpan license'}</Button
    >
  </form></Modal
>
<Modal
  title={confirm?.action === 'delete' ? 'Hapus license' : 'Perpanjang license'}
  bind:open={confirmOpen}
  afterClose={() => (confirm = undefined)}
  ><div class="confirm">
    {#if confirm}<p>
        {confirm.action === 'delete'
          ? `Hapus license ${confirm.license.allowed_domain}? Tindakan ini tidak dapat dibatalkan.`
          : `Perpanjang masa berlaku ${confirm.license.allowed_domain}.`}
      </p>
      {#if confirm.action === 'extend'}<TextField
          id="days"
          label="Tambahan hari"
          type="number"
          bind:value={days}
          required
        />{/if}<Button onclick={runConfirmed} {busy}
        >{confirm.action === 'delete' ? 'Hapus license' : 'Konfirmasi'}</Button
      ><button onclick={() => (confirmOpen = false)}>Batal</button>{/if}
  </div></Modal
>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  h1,
  p {
    margin: 0;
  }
  .eyebrow {
    font-size: 0.8rem;
    font-weight: 900;
    letter-spacing: 0.08em;
  }
  .create {
    min-height: 44px;
    border: var(--border);
    border-radius: 8px;
    background: var(--red);
    box-shadow: var(--shadow-sm);
    color: var(--white);
    padding: 0.6rem 1rem;
    font-weight: 800;
    cursor: pointer;
  }
  .page-title,
  .filters,
  .form,
  .confirm {
    display: grid;
    gap: 1rem;
    margin: 2rem 0;
  }
  .filters {
    grid-template-columns: minmax(0, 1fr) minmax(180px, 0.35fr) auto;
    align-items: end;
  }
  .page-title {
    padding: 0;
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
  .table-scroll {
    overflow-x: auto;
    border: var(--border);
    border-radius: 10px;
    background: var(--white);
    box-shadow: none;
  }
  table {
    width: 100%;
    min-width: 1060px;
    border-collapse: collapse;
  }
  th,
  td {
    border-bottom: 1px solid var(--ink);
    padding: 0.75rem;
    text-align: left;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .actions button,
  .link,
  .confirm > button {
    min-height: 36px;
    border: var(--border);
    border-radius: 6px;
    background: var(--paper);
    padding: 0.35rem 0.5rem;
    font-weight: 700;
    cursor: pointer;
  }
  .link {
    display: block;
    margin-top: 0.35rem;
  }
  .danger {
    background: #f6d0ca !important;
  }
  .empty {
    border: var(--border);
    border-radius: 10px;
    background: var(--white);
    padding: 1rem;
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
  nav {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  nav a,
  nav span {
    min-width: 44px;
    min-height: 44px;
    display: grid;
    place-items: center;
    border: var(--border);
    border-radius: 8px;
    background: var(--white);
    padding: 0.5rem 0.75rem;
  }
  @media (max-width: 600px) {
    .filters {
      grid-template-columns: 1fr;
    }
  }
</style>
