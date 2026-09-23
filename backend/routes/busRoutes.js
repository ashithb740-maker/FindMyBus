const express = require('express');
const Bus = require('../models/Bus');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.routeId) filter.routeId = req.query.routeId;

    const buses = await Bus.find(filter).populate('routeId', 'routeNumber name source destination');
    res.json({ success: true, data: buses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id).populate('routeId');
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
    res.json({ success: true, data: bus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
