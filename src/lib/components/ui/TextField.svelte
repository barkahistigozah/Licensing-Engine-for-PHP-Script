<script lang="ts">
  let {
    id,
    label,
    type = 'text',
    value = $bindable(''),
    hint,
    error,
    required = false,
    ...rest
  } = $props<{
    id: string
    label: string
    type?: string
    value?: string
    hint?: string
    error?: string
    required?: boolean
    autocomplete?: string
    name?: string
  }>()
  const describedBy = () =>
    error ? `${id}-error` : hint ? `${id}-hint` : undefined
</script>

<label for={id}
  >{label}{#if required}<span aria-hidden="true"> *</span>{/if}</label
>
<input
  {id}
  {type}
  bind:value
  aria-invalid={Boolean(error)}
  aria-describedby={describedBy()}
  {required}
  {...rest}
/>
{#if error}<p id="{id}-error" class="error">{error}</p>{:else if hint}<p
    id="{id}-hint"
  >
    {hint}
  </p>{/if}

<style>
  label {
    display: block;
    margin-bottom: 0.35rem;
    font-weight: 700;
  }
  input {
    width: 100%;
    min-height: 44px;
    border: var(--border);
    border-radius: 8px;
    padding: 0.65rem 0.75rem;
    background: var(--white);
    color: var(--ink);
  }
  p {
    margin: 0.35rem 0 0;
    font-size: 0.875rem;
  }
  .error {
    color: #8a241b;
    font-weight: 700;
  }
</style>
