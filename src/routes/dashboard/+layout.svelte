<script lang="ts">
  import AppSidebar from '$lib/components/AppSidebar.svelte'
  import Modal from '$lib/components/ui/Modal.svelte'
  let { children, data } = $props()
  let drawer = $state(false)
</script>

<div class="workspace-shell">
  <aside>
    <a class="sidebar-wordmark" href="/dashboard">LEPS</a><AppSidebar
      email={data.user.email}
    />
  </aside>
  <header class="mobile-header">
    <button
      class="menu-toggle"
      aria-label="Buka navigasi"
      onclick={() => (drawer = true)}
      ><span class="hamburger" aria-hidden="true"><i></i><i></i><i></i></span
      ></button
    ><strong>Control room</strong>
  </header>
  <Modal drawer title="Navigasi" closeLabel="Tutup navigasi" bind:open={drawer}
    ><AppSidebar
      close={() => (drawer = false)}
      email={data.user.email}
    /></Modal
  >
  <main>{@render children()}</main>
</div>

<style>
  .workspace-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    background: var(--paper);
  }
  aside {
    display: grid;
    align-content: start;
    gap: 2rem;
    padding: 1rem;
    background: var(--green);
    color: var(--white);
  }
  .sidebar-wordmark {
    min-width: 68px;
    min-height: 38px;
    display: grid;
    place-items: center;
    justify-self: start;
    border: var(--border);
    border-radius: 6px;
    background: var(--green);
    margin: 0 0.5rem;
    padding: 0.45rem 0.65rem;
    color: var(--white);
    font-size: 0.85rem;
    font-weight: 900;
    text-decoration: none;
  }
  main {
    min-width: 0;
    padding: clamp(1rem, 3vw, 2rem);
  }
  .mobile-header {
    display: none;
  }
  @media (max-width: 767px) {
    .workspace-shell {
      display: block;
    }
    aside {
      display: none;
    }
    .mobile-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-height: 60px;
      border-bottom: var(--border);
      background: var(--white);
      padding: 0.5rem 1rem;
    }
    .mobile-header button {
      min-height: 44px;
      min-width: 44px;
      border: var(--border);
      border-radius: 8px;
      background: var(--sand);
      font-weight: 900;
    }
    .hamburger {
      display: grid;
      gap: 4px;
      width: 18px;
      margin: auto;
    }
    .hamburger i {
      display: block;
      height: 2px;
      background: var(--ink);
    }
  }
</style>
