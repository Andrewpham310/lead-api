const dns = require('dns');
const mongoose = require('mongoose');

// Node.js on Windows can fail mongodb+srv SRV lookups against some routers/DNS
// (querySrv ECONNREFUSED). Public DNS servers resolve Atlas SRV records reliably.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
