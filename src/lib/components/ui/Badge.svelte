<script lang="ts">
  let { value } = $props<{ value: string }>()
</script>

<span class="status-badge" class:bad={value !== 'ACTIVE' && value !== 'SUCCESS'}
  >{value}</span
>

<style>
  span {
    display: inline-block;
    border: var(--border);
    border-radius: 6px;
    background: #d8ead9;
    padding: 0.2rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 900;
  }
  .bad {
    background: #f6d0ca;
  }
</style>
