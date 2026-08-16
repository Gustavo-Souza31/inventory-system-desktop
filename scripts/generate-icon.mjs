// Gera build/icon.ico (multi-resolução) a partir de build/icon.svg.
// Rode com: node scripts/generate-icon.mjs
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'fs';

const SIZES = [16, 32, 48, 64, 128, 256];
const svgBuffer = readFileSync(new URL('../build/icon.svg', import.meta.url));

async function main() {
    // PNG grande (1024px) útil como fonte pra outros formatos (ex: Android/PWA no futuro)
    await sharp(svgBuffer).resize(1024, 1024).png().toFile('build/icon.png');

    const pngBuffers = await Promise.all(
        SIZES.map((size) => sharp(svgBuffer).resize(size, size).png().toBuffer())
    );

    const icoBuffer = await pngToIco(pngBuffers);
    writeFileSync('build/icon.ico', icoBuffer);

    console.log(`build/icon.ico gerado (${SIZES.join(', ')}px) e build/icon.png (1024px).`);
}

main().catch((err) => {
    console.error('Falha ao gerar o ícone:', err);
    process.exit(1);
});
