var express = require('express');
var router = express.Router();
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

/* GET home page. */
router.get('/', async function(req, res, next) {
    res.send('Usage: GET /data/:table<br />Available tables: stop_times, shapes, trips, stops, routes, calendar, feed_info, agency, calendar_dates')
});
router.get('/:table', async function(req, res, next) {
    try {
        const db = await open({ filename: './public/datasets/SEQ_GTFS/SEQ_GTFS.sqlite', driver: sqlite3.Database });
        const rows = await db.all("SELECT * FROM " + req.params.table + ";");
        res.json(rows);
        await db.close();
    }
    catch (err) {
        res.status(500).send('Error retrieving data from table \'' + req.params.table + '\': ' + err.message);
    }
});

module.exports = router;
