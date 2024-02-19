import { WASMagic } from "../../dist/index.js";
const magic = await WASMagic.create();

export default (buf) => magic.detect(buf);
