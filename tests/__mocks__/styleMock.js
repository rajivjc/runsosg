// CSS module mock — returns class names as-is via Proxy
module.exports = new Proxy({}, {
  get(_, name) {
    if (name === '__esModule') return false;
    return String(name);
  }
});
