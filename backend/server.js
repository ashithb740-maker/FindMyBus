const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const busRoutes = require('./routes/busRoutes');
const routeRoutes = require('./routes/routeRoutes');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

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

  socket.on('driver:location', (payload) => {
    if (!payload || typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') return;
    io.emit('bus:location', {
      busId: payload.busId || null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: payload.speed ?? null,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

(async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚌 Find My Bus server running at http://localhost:${PORT}`);
  });
})();
