<script lang="ts">
  let { children } = $props<{ children?: import('svelte').Snippet }>()
</script>

<p class="alert" role="alert">{@render children?.()}</p>

<style>
  .alert {
    margin: 0;
    border: var(--border);
    border-radius: 8px;
    background: #f6d0ca;
    padding: 0.75rem;
    font-weight: 700;
  }
</style>
