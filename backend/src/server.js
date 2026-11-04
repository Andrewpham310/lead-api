require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { assertValidEnv, parseTrustProxy } = require('./config/env');
const errorMiddleware = require('./middleware/errorMiddleware');
const { generalLimiter } = require('./middleware/rateLimitMiddleware');

const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const leadRoutes = require('./routes/leadRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const googleRoutes = require('./routes/googleRoutes');

const app = express();

// Behind Render's proxy every request comes from the proxy IP; trust exactly the
// configured number of hops so req.ip (and every rate limiter) sees the real client.
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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
app.use('/api/google', googleRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  assertValidEnv();
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
