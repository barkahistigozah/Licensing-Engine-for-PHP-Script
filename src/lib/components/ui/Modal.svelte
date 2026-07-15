<script lang="ts">
  let {
    title,
    closeLabel = 'Tutup',
    drawer = false,
    afterClose,
    open = $bindable(false),
    children
  } = $props<{
    title: string
    closeLabel?: string
    drawer?: boolean
    afterClose?: () => void
    open?: boolean
    children?: import('svelte').Snippet
  }>()
  function modal(dialog: HTMLDialogElement) {
    dialog.showModal()
    return {
      destroy() {
        if (dialog.open) dialog.close()
      }
    }
  }
</script>

{#if open}<dialog
    class:drawer
    use:modal
    aria-labelledby="modal-title"
    onclose={() => {
      open = false
      afterClose?.()
    }}
  >
    <section>
      <header>
        <h2 id="modal-title">{title}</h2>
        <button aria-label={closeLabel} onclick={() => (open = false)}>×</button
        >
      </header>
      {@render children?.()}
    </section>
  </dialog>{/if}

<style>
  dialog {
    width: min(100% - 2rem, 640px);
    border: var(--border);
    border-radius: 12px;
    background: var(--white);
    box-shadow: var(--shadow-md);
    padding: 0;
  }
  dialog::backdrop {
    background: rgb(39 50 41 / 45%);
  }
  dialog.drawer {
    width: min(86vw, 320px);
    height: 100dvh;
    max-height: none;
    margin: 0;
    border-width: 0 2px 0 0;
    border-radius: 0;
    overflow: hidden;
    animation: drawer-in 180ms ease-out;
  }
  dialog.drawer section {
    height: 100%;
    overflow-y: auto;
    padding: 1rem;
  }
  dialog.drawer header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--ink);
  }
  section {
    padding: 1rem;
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
  }
  h2 {
    margin: 0;
  }
  button {
    min-width: 44px;
    min-height: 44px;
    border: var(--border);
    background: var(--paper);
    font-size: 1.5rem;
  }
  @media (max-width: 600px) {
    dialog:not(.drawer) {
      width: calc(100% - 1rem);
      max-height: calc(100% - 1rem);
    }
  }
  @keyframes drawer-in {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }
</style>
