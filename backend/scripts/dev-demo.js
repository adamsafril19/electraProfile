// Menjalankan backend dengan data demo (seed ulang tiap dijalankan). Data asli di store.json tidak disentuh.
const { spawn, spawnSync } = require('child_process');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
const demoFile = path.join(backendDir, 'data', 'demo-store.json');

const seed = spawnSync('npm', ['run', 'seed:demo'], { cwd: backendDir, stdio: 'inherit', shell: true, env: { ...process.env, DEMO_FILE: demoFile } });
if (seed.status !== 0) process.exit(seed.status || 1);

console.log('\n🧪 Mode DEMO: backend memakai', demoFile, '\n');
const dev = spawn('npm', ['run', 'dev'], { cwd: backendDir, stdio: 'inherit', shell: true, env: { ...process.env, DATA_FILE: demoFile } });
dev.on('exit', (code) => process.exit(code || 0));
