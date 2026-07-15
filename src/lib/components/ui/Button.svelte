<script lang="ts">
  let {
    href,
    disabled = false,
    busy = false,
    type = 'button',
    onclick,
    children,
    ...rest
  } = $props<{
    href?: string
    disabled?: boolean
    busy?: boolean
    type?: 'button' | 'submit' | 'reset'
    onclick?: () => void
    children?: import('svelte').Snippet
  }>()
</script>

{#if href}
  <a
    class:disabled
    aria-disabled={disabled || busy}
    href={disabled || busy ? undefined : href}
    {...rest}
  >
    {@render children?.()}
  </a>
{:else}
  <button {type} disabled={disabled || busy} {onclick} {...rest}
    >{@render children?.()}</button
  >
{/if}

<style>
  a,
  button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    border: var(--border);
    border-radius: 8px;
    background: var(--red);
    box-shadow: var(--shadow-sm);
    color: var(--white);
    cursor: pointer;
    font-weight: 700;
    text-decoration: none;
  }
  a:hover,
  button:hover:not(:disabled) {
    transform: translate(-1px, -1px);
    box-shadow: var(--shadow-md);
  }
  .disabled,
  button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
</style>
