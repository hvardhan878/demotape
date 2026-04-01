// Skip automatic Chrome download during npm install.
// We explicitly install chrome-headless-shell in the Dockerfile instead.
module.exports = {
  skipDownload: true,
}
