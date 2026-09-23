const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true, trim: true },
  registrationNumber: { type: String, trim: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'inactive' },
  location: {
    latitude: Number,
    longitude: Number,
    speed: Number,
    updatedAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Bus', busSchema);
