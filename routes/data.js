var express = require('express');
var router = express.Router();
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const {exists} = require("node:fs");

/* GET home page. */
router.get('/', async function(req, res, next) {
    res.send('Usage: GET /data/:region/:table<br />Available regions: SEQ, TWB, GYM<br />Available tables: stop_times, shapes, trips, stops, routes, calendar, feed_info, agency, calendar_dates')
});
router.get('/tables', async function(req, res, next) {
    res.send('Usage: GET /data/:region/:table<br />Available regions: SEQ, TWB, GYM<br />Available tables: stop_times, shapes, trips, stops, routes, calendar, feed_info, agency, calendar_dates')
});
router.get('/seq/:table', async function(req, res, next) {
    try {
        const db = await open({ filename: './public/datasets/SEQ_GTFS/SEQ_GTFS.sqlite', driver: sqlite3.Database });
        const rows = await db.all("SELECT * FROM " + req.params.table + ";");
        res.json(rows);
        await db.close();
    }
    catch (err) {
        if (exists('./public/datasets/SEQ_GTFS/SEQ_GTFS.sqlite'))
            res.status(404).send('Did you forget to generate the SQLite database? Run <code>node run.js</code> or <code>run.bat</code> in the root directory.')
        else
            res.status(500).send('Error retrieving data from the Southeast Queensland table \'' + req.params.table + '\': ' + err.message);
    }
});
router.get('/twb/:table', async function(req, res, next) {
    try {
        const db = await open({ filename: './public/datasets/TWB_GTFS/TWB_GTFS.sqlite', driver: sqlite3.Database });
        const rows = await db.all("SELECT * FROM " + req.params.table + ";");
        res.json(rows);
        await db.close();
    }
    catch (err) {
        if (exists('./public/datasets/TWB_GTFS/TWB_GTFS.sqlite'))
            res.status(404).send('Did you forget to generate the SQLite database? Run <code>node run.js</code> or <code>run.bat</code> in the root directory.')
        else
            res.status(500).send('Error retrieving data from the Toowoomba table \'' + req.params.table + '\': ' + err.message);
    }
});
router.get('/gym/:table', async function(req, res, next) {
    try {
        const db = await open({ filename: './public/datasets/GYM_GTFS/GYM_GTFS.sqlite', driver: sqlite3.Database });
        const rows = await db.all("SELECT * FROM " + req.params.table + ";");
        res.json(rows);
        await db.close();
    }
    catch (err) {
        if (exists('./public/datasets/GYM_GTFS/GYM_GTFS.sqlite'))
            res.status(404).send('Did you forget to generate the SQLite database? Run <code>node run.js</code> or <code>run.bat</code> in the root directory.')
        else
            res.status(500).send('Error retrieving data from the Gympie table \'' + req.params.table + '\': ' + err.message);
    }
});

module.exports = router;
