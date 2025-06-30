// Node.js launcher script to start Deno backend, React frontend, and open browser
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Determine Deno binary path
let denoBinary = 'deno';
if (process.platform === 'win32') {
  const localDeno = path.join(__dirname, 'deno.exe');
  if (fs.existsSync(localDeno)) {
    denoBinary = localDeno;
  }
}

// Start Deno backend
const denoProcess = spawn(denoBinary, ['run', '--allow-env', '--allow-net', 'src/deno_entry.ts'], {
  cwd: path.join(__dirname, 'worker'),
  stdio: 'inherit'
});

denoProcess.on('error', (err) => {
  console.error('Failed to start Deno backend:', err);
  process.exit(1);
});

// Start React frontend
const frontendProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit'
});

frontendProcess.on('error', (err) => {
  console.error('Failed to start frontend:', err);
  process.exit(1);
});

// Wait a few seconds, then open browser
setTimeout(async () => {
  try {
    const open = (await import('open')).default;
    await open('http://localhost:3000');
    console.log('Opened http://localhost:3000 in your default browser.');
  } catch (err) {
    console.error('Failed to open browser:', err);
  }
}, 5000);

// Handle exit
process.on('SIGINT', () => {
  denoProcess.kill();
  frontendProcess.kill();
  process.exit();
});
