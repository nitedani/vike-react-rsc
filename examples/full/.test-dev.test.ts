import { rmSync } from 'node:fs'
import { testRun } from './.testRun'
// Start from a cold Vite cache, as after a fresh clone or a dependency change
rmSync(new URL('./node_modules/.vite', import.meta.url), { recursive: true, force: true })
testRun('pnpm run dev')
