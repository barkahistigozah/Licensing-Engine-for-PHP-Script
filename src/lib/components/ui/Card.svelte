<script lang="ts">
  let { children, class: className = '' } = $props<{
    children?: import('svelte').Snippet
    class?: string
  }>()
</script>

<section class="card {className}">{@render children?.()}</section>

<style>
  .card {
    border: var(--border);
    border-radius: 12px;
    background: var(--white);
    box-shadow: var(--shadow-md);
    padding: clamp(1rem, 3vw, 1.5rem);
  }
</style>
