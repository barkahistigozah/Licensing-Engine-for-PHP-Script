import adapter from '@sveltejs/adapter-vercel'

export default {
  kit: {
    adapter: adapter({ runtime: 'nodejs24.x' }),
    alias: {
      $lib: 'src/lib'
    },
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self'],
        'connect-src': ['self'],
        'img-src': ['self', 'data:'],
        'frame-ancestors': ['none'],
        'base-uri': ['self'],
        'form-action': ['self']
      }
    }
  }
}
