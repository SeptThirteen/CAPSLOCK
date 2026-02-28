// electron-builder hook: runs after pack, before installer is created
exports.default = async function (context) {
  console.log('[after-pack] Pack complete for platform:', context.electronPlatformName)
}
