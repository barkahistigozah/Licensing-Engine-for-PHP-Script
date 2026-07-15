<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { authClient } from '$lib/auth-client'
  let { close = () => {}, email } = $props<{
    close?: () => void
    email?: string
  }>()
  let message = $state('')
  let hydrated = $state(false)
  onMount(() => {
    hydrated = true
  })
  async function logout() {
    message = ''
    const result = await authClient.signOut()
    if (result.error) {
      message = 'Sesi tidak dapat diakhiri. Coba lagi.'
      return
    }
    close()
    await goto('/login')
  }
</script>

<nav aria-label="Dashboard">
  <div class="nav-links">
    <a
      class:active={page.url.pathname === '/dashboard'}
      href="/dashboard"
      onclick={close}>Overview</a
    ><a
      class:active={page.url.pathname.startsWith('/dashboard/licenses')}
      href="/dashboard/licenses"
      onclick={close}>Licenses</a
    ><a
      class:active={page.url.pathname.startsWith('/dashboard/audit-logs')}
      href="/dashboard/audit-logs"
      onclick={close}>Audit logs</a
    >
  </div>
  <div class="account">
    {#if email}<p class="identity">{email}</p>{/if}<button
      class="logout"
      disabled={!hydrated}
      onclick={logout}>Keluar</button
    >{#if message}<p role="alert">{message}</p>{/if}
  </div>
</nav>

<style>
  nav {
    min-height: calc(100vh - 88px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1.5rem;
  }
  .nav-links,
  .account {
    display: grid;
    gap: 1rem;
  }
  .identity {
    margin: 0;
    border-top: 1px solid rgb(255 253 248 / 60%);
    padding-top: 1rem;
    overflow-wrap: anywhere;
    font-size: 0.8rem;
    font-weight: 700;
  }
  a,
  button {
    min-height: 44px;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 0.75rem;
    background: transparent;
    color: inherit;
    font-weight: 900;
    text-align: left;
    text-decoration: none;
  }
  a:hover,
  a.active,
  button:hover {
    border-color: var(--ink);
    background: var(--sand);
    color: var(--ink);
  }
  button {
    cursor: pointer;
  }
  .logout {
    border-color: var(--ink);
    background: var(--red);
    box-shadow: var(--shadow-sm);
    color: var(--white);
  }
  .logout:hover {
    background: var(--red);
    color: var(--white);
  }
  .logout:disabled {
    cursor: wait;
    opacity: 0.65;
  }
</style>
