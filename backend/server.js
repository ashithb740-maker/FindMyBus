const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const Bus = require('./models/Bus');
const busRoutes = require('./routes/busRoutes');
const routeRoutes = require('./routes/routeRoutes');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'Find My Bus API', status: 'running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('driver:location', async (payload) => {
    if (!payload || typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') return;

    const location = {
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: typeof payload.speed === 'number' ? payload.speed : null,
      updatedAt: new Date()
    };

    if (payload.busId) {
      try {
        await Bus.findByIdAndUpdate(payload.busId, { location, status: 'active' });
      } catch (error) {
        console.error('Could not save bus location:', error.message);
      }
    }

    io.emit('bus:location', {
      busId: payload.busId || null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: location.speed,
      timestamp: location.updatedAt.toISOString()
    });
  });

  socket.on('driver:status', async (payload) => {
    if (!payload?.busId || !['active', 'inactive'].includes(payload.status)) return;
    try {
      await Bus.findByIdAndUpdate(payload.busId, { status: payload.status });
      io.emit('bus:status', { busId: payload.busId, status: payload.status });
    } catch (error) {
      console.error('Could not update bus status:', error.message);
    }
  });

  socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
});

// Express 5 compatible SPA fallback.
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

(async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚌 Find My Bus server running at http://localhost:${PORT}`);
  });
})();
