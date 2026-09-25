const express = require('express');
const cors = require('cors');
const connectDB = require('../config/db');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const counsellorRoutes = require('./routes/counsellorRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const freeSessionRoutes = require('./routes/freeSessionRoutes');

const app = express();

const path = require('path');

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '../../public')));
app.use('/api/public', express.static(path.join(__dirname, '../../public')));

// Connect to Database
connectDB();

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Client API Service is running',
    port: process.env.CLIENT_PORT || 5002,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/counsellors', counsellorRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/free-sessions', freeSessionRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start Server
const PORT = process.env.CLIENT_PORT || 5002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Client API Server running on http://0.0.0.0:${PORT}`);
});
