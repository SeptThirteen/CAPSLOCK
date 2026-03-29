const { spawn } = require('child_process')

// Some shells export ELECTRON_RUN_AS_NODE and break Electron app startup.
delete process.env.ELECTRON_RUN_AS_NODE

const electronPath = require('electron')
const appArgs = process.argv.slice(2)

const child = spawn(electronPath, ['.', ...appArgs], {
  stdio: 'inherit',
  env: process.env
})

child.on('error', (err) => {
  console.error('[run-electron] failed to start Electron:', err.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error('[run-electron] Electron exited with signal:', signal)
    process.exit(1)
  }
  process.exit(code ?? 0)
})
