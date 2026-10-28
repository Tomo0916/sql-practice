// Print a QR code for argv[2] as an inline SVG (uses the app's vendored qrcode-generator).
import qrcode from '../next/vendor/qrcode.js';
const qr = qrcode(0, 'M');
qr.addData(process.argv[2]);
qr.make();
const n = qr.getModuleCount();
let d = '';
for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
process.stdout.write(`<svg viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`);
