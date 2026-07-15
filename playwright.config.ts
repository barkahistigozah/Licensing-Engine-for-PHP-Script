import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/smoke',
  testMatch: '**/*.pw.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command:
      'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-e2e.ps1',
    port: 4173,
    reuseExistingServer: false
  },
  projects: [
    { name: 'setup', testMatch: '**/auth.setup.pw.ts' },
    {
      name: 'public',
      testIgnore: [
        '**/auth.setup.pw.ts',
        '**/dashboard-*.pw.ts',
        '**/licenses.pw.ts',
        '**/audit-logs.pw.ts',
        '**/responsive.pw.ts',
        '**/zz-logout.pw.ts'
      ]
    },
    {
      name: 'chromium',
      testMatch: [
        '**/dashboard-*.pw.ts',
        '**/licenses.pw.ts',
        '**/audit-logs.pw.ts',
        '**/responsive.pw.ts',
        '**/zz-logout.pw.ts'
      ],
      dependencies: ['setup'],
      use: { storageState: 'test-results/.auth/admin.json' }
    }
  ]
})
