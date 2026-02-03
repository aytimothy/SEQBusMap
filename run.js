// Update script to grab the latest SEQ_GTFS.zip from Translink then convert it to GeoJSON.
const path = require('path');
const fs = require('fs');
import gtfsToGeoJSON from 'gtfs-to-geojson';
import { readFile } from 'fs/promises'
const https = require('https');
const { DatabaseSync } = require('node:sqlite');

const URL = 'https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip';
const TARGET_DIR = path.join(process.cwd(), 'public/datasets/SEQ_GTFS');
const TARGET_FILE = path.join(TARGET_DIR, 'SEQ_GTFS.zip');
const TEMP_FILE = TARGET_FILE + '.tmp';
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const config = JSON.parse(
    await readFile(new URL(path.join(TARGET_DIR, 'config.json'), import.meta.url))
);

async function fileIsOldOrMissing(filePath) {
    try {
        const st = await fs.promises.stat(filePath);
        return (Date.now() - st.mtimeMs) > MONTH_MS;
    } catch (err) {
        return true; // missing or inaccessible
    }
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Download failed: ${res.statusCode} ${res.statusMessage}`));
                res.resume();
                return;
            }
            const fileStream = fs.createWriteStream(dest);
            res.pipe(fileStream);
            fileStream.on('finish', () => fileStream.close(resolve));
            fileStream.on('error', reject);
        });
        req.on('error', reject);
    });
}

async function copyRecursive(src, dest) {
    const st = await fs.promises.stat(src);
    if (st.isDirectory()) {
        await fs.promises.mkdir(dest, { recursive: true });
        const entries = await fs.promises.readdir(src);
        for (const e of entries) {
            await copyRecursive(path.join(src, e), path.join(dest, e));
        }
    } else {
        await fs.promises.copyFile(src, dest);
    }
}

async function moveDirContents(srcDir, destDir) {
    try {
        await fs.promises.access(srcDir);
    } catch (err) {
        console.log(`No geojson source at ${srcDir}, skipping move.`);
        return;
    }

    await fs.promises.mkdir(destDir, { recursive: true });
    const entries = await fs.promises.readdir(srcDir);
    for (const e of entries) {
        const s = path.join(srcDir, e);
        const d = path.join(destDir, e);
        await copyRecursive(s, d);
    }

    // remove the source directory after copying
    await fs.promises.rm(srcDir, { recursive: true, force: true });
    console.log(`Moved geojson contents from ${srcDir} -> ${destDir}`);
}

async function getAllRoutesFromGeoJson(sqliteDir) {
    const database = new DatabaseSync(sqliteDir);
    const rows = database.prepare('SELECT route_id, route_short_name, route_long_name, route_type FROM routes').all();
    const routes = rows.map(row => ({
        route: row.route_short_name,
        name: row.route_long_name,
        route_type: row.route_type
    }));
    return { routes };
}

(async function main() {
    // Download translink GTFS data file.
    try {
        const need = await fileIsOldOrMissing(TARGET_FILE);
        if (!need) {
            console.log(`Up to date: ${TARGET_FILE}`);
            return;
        }

        await fs.promises.mkdir(TARGET_DIR, { recursive: true });
        console.log(`Downloading ${URL} -> ${TARGET_FILE}`);
        await download(URL, TEMP_FILE);
        await fs.promises.rename(TEMP_FILE, TARGET_FILE);
        console.log('Download complete.');
    } catch (err) {
        // clean up temp file if present
        try { if (fs.existsSync(TEMP_FILE)) fs.unlinkSync(TEMP_FILE); } catch (_) {}
        console.error('Error:', err.message || err);
        process.exitCode = 1;
    }

    // Generate GeoJSON using gtfs-to-geojson
    try {
        await gtfsToGeoJSON(config);
        console.log('GeoJSON Generation Successful');

        const SRC_GEOJSON = path.join(TARGET_DIR, 'geojson');
        const DEST_GEOJSON = path.join(process.cwd(), 'public', 'datasets', 'SEQ_GTFS', 'geojson');
        await moveDirContents(SRC_GEOJSON, DEST_GEOJSON);
    } catch (err) {
        console.error('GeoJSON generation error:', err);
    }
})();
