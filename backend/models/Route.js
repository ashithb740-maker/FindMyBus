const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  sequence: { type: Number, required: true }
}, { _id: false });

const routeSchema = new mongoose.Schema({
  routeNumber: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  source: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  stops: { type: [stopSchema], default: [] },
  estimatedDurationMinutes: { type: Number, default: 0 },
  distanceKm: { type: Number, default: 0 },
  fare: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);
