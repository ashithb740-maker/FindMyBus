const express = require('express');
const Route = require('../models/Route');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const filter = search
      ? { $or: [
          { routeNumber: new RegExp(search, 'i') },
          { name: new RegExp(search, 'i') },
          { source: new RegExp(search, 'i') },
          { destination: new RegExp(search, 'i') },
          { 'stops.name': new RegExp(search, 'i') }
        ] }
      : {};

    const routes = await Route.find(filter).sort({ routeNumber: 1 });
    res.json({ success: true, data: routes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: route });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
