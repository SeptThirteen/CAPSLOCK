module.exports = {
  appId: 'com.capslock.app',
  productName: 'CAPSLOCK',
  directories: { output: 'dist' },
  files: [
    'src/**/*',
    'assets/**/*',
    'config/**/*',
    '!node_modules/.cache'
  ],
  extraResources: [
    { from: 'assets/', to: 'assets/' }
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'assets/icon.ico',
    signAndEditExecutable: false,
    requestedExecutionLevel: 'requireAdministrator'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    runAfterFinish: true
  },
  asarUnpack: [
    '**/node_modules/uiohook-napi/**',
    '**/node_modules/koffi/**'
  ],
  afterPack: './scripts/after-pack.js'
}
