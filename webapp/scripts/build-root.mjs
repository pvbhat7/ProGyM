import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webappRoot = resolve(__dirname, '..')

const env = { ...process.env, VITE_BASE_PATH: '/' }

const tsc = spawnSync('npx', ['tsc', '-b'], {
  cwd: webappRoot,
  env,
  stdio: 'inherit',
  shell: true,
})
if (tsc.status !== 0) process.exit(tsc.status ?? 1)

const vite = spawnSync(
  'npx',
  ['vite', 'build', '--outDir', 'dist-root', '--emptyOutDir'],
  { cwd: webappRoot, env, stdio: 'inherit', shell: true },
)
if (vite.status !== 0) process.exit(vite.status ?? 1)

const htaccess = `Options -MultiViews
RewriteEngine On
RewriteBase /
RewriteRule ^wc2026(/|$) - [L]
RewriteRule ^$ /landing.html [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
`

writeFileSync(resolve(webappRoot, 'dist-root', '.htaccess'), htaccess, 'utf8')
console.log('\n[build-root] wrote dist-root/.htaccess with RewriteBase /')
