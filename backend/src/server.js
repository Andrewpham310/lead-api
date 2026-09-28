require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/errorMiddleware');
const { generalLimiter } = require('./middleware/rateLimitMiddleware');

const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const leadRoutes = require('./routes/leadRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const sourceRoutes = require('./routes/sourceRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(generalLimiter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Next Waves Lead API is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sources', sourceRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Stop the other process (e.g. another "npm run dev") or run: npx kill-port ${PORT}`
      );
    } else {
      console.error(`Server error: ${err.message}`);
    }
    process.exit(1);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;
