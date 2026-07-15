<script lang="ts">
  import { goto } from '$app/navigation'
  import { authClient } from '$lib/auth-client'
  import Card from '$lib/components/ui/Card.svelte'
  import InlineAlert from '$lib/components/ui/InlineAlert.svelte'
  import TextField from '$lib/components/ui/TextField.svelte'

  let email = $state('')
  let password = $state('')
  let busy = $state(false)
  let message = $state('')

  async function submit() {
    busy = true
    message = ''
    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error || !result.data)
        message = 'Email atau password tidak valid'
      else await goto('/dashboard')
    } catch {
      message = 'Email atau password tidak valid'
    } finally {
      busy = false
    }
  }
</script>

<svelte:head><title>Login admin — LEPS</title></svelte:head>
<main class="login-frame">
  <Card class="login-card">
    <p class="eyebrow">ADMIN CONTROL ROOM</p>
    <h1>Selamat datang kembali.</h1>
    <p class="login-copy">
      Masuk untuk mengelola license dan memantau aktivitas verifikasi.
    </p>
    {#if message}<InlineAlert>{message}</InlineAlert>{/if}
    <form
      onsubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <TextField
        id="email"
        label="Email"
        type="email"
        bind:value={email}
        required
        autocomplete="email"
      />
      <TextField
        id="password"
        label="Password"
        type="password"
        bind:value={password}
        required
        autocomplete="current-password"
      />
      <button type="submit" disabled={busy}
        >{busy ? 'Memeriksa…' : 'Masuk →'}</button
      >
    </form>
    <small>Protected admin access · Session managed by Better Auth</small>
  </Card>
</main>

<style>
  .login-frame {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: linear-gradient(135deg, var(--sand) 0 40%, var(--paper) 40%);
  }
  :global(.login-card) {
    width: min(100%, 440px);
    display: grid;
    gap: 1rem;
  }
  .eyebrow {
    margin: 0;
    color: var(--red);
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.09em;
  }
  h1,
  p {
    margin: 0;
  }
  h1 {
    font-size: clamp(2rem, 5vw, 2.7rem);
    line-height: 0.95;
    letter-spacing: -0.05em;
  }
  .login-copy {
    line-height: 1.5;
  }
  form {
    display: grid;
    gap: 1rem;
    margin-top: 0.35rem;
  }
  button {
    min-height: 44px;
    border: var(--border);
    border-radius: 8px;
    background: var(--red);
    box-shadow: var(--shadow-sm);
    color: var(--white);
    font-weight: 900;
    text-transform: uppercase;
    cursor: pointer;
  }
  :global(.login-card) small {
    border-top: 1px solid var(--ink);
    padding-top: 1rem;
    font-size: 0.72rem;
    font-weight: 700;
  }
  @media (max-width: 600px) {
    .login-frame {
      background: var(--paper);
    }
  }
</style>
