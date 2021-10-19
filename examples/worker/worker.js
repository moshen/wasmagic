const { WASMagic } = require("../../");

module.exports = (async function init() {
  const magic = await WASMagic.create();
  return (buf) => magic.getMime(buf);
})();
