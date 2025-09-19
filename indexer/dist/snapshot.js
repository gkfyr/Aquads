import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import { sign } from './seal.js';
function sha256Hex(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}
export async function snapshotUrl(url, opts = {}) {
    const ts = Math.floor(Date.now() / 1000);
    const baseDir = path.join(process.cwd(), 'indexer', 'uploads', 'snapshots');
    fs.mkdirSync(baseDir, { recursive: true });
    const id = `${ts}-${sha256Hex(url).slice(0, 8)}`;
    const outDir = path.join(baseDir, id);
    fs.mkdirSync(outDir, { recursive: true });
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    // Check ad slot visibility (basic): element with data-slot-id or #sui-ad
    const visible = await page.evaluate((slotId) => {
        function isVisible(el) {
            if (!el)
                return false;
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        }
        if (slotId) {
            const el = document.querySelector(`[data-slot-id="${slotId}"]`);
            if (isVisible(el))
                return true;
        }
        const el = document.querySelector('#sui-ad, [data-slot-id]');
        return isVisible(el);
    }, opts.slotId || null);
    const html = await page.content();
    const htmlPath = path.join(outDir, 'snapshot.html');
    fs.writeFileSync(htmlPath, html);
    const htmlHash = sha256Hex(html);
    const htmlSize = fs.statSync(htmlPath).size;
    const shotPath = path.join(outDir, 'screenshot.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    await browser.close();
    const shotBuf = fs.readFileSync(shotPath);
    const shotHash = sha256Hex(shotBuf);
    const shotSize = shotBuf.length;
    const manifest = {
        url,
        slot_id: opts.slotId || null,
        timestamp: ts,
        files: {
            html: { sha256: `sha256:${htmlHash}`, path: `/uploads/snapshots/${id}/snapshot.html`, size: htmlSize },
            screenshot: { sha256: `sha256:${shotHash}`, path: `/uploads/snapshots/${id}/screenshot.png`, size: shotSize },
        },
    };
    const manifestStr = JSON.stringify(manifest);
    const manifestSha = sha256Hex(manifestStr);
    const manifestPath = path.join(outDir, 'manifest.json');
    fs.writeFileSync(manifestPath, manifestStr);
    // Walrus mock: blobId is sha256 of manifest
    const blobId = `mock://walrus-${manifestSha}`;
    const policySig = sign(Buffer.from(manifestStr));
    return {
        id,
        url,
        ts,
        files: {
            html: { path: manifest.files.html.path, sha256: htmlHash, size: htmlSize },
            screenshot: { path: manifest.files.screenshot.path, sha256: shotHash, size: shotSize },
        },
        manifestPath: `/uploads/snapshots/${id}/manifest.json`,
        manifestSha256: manifestSha,
        blobId,
        policySig,
        adSlotVisible: visible,
    };
}
