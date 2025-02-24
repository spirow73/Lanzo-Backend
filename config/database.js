const mongoose = require('mongoose');

const connectDB = async (retries = 5, delay = 5000) => {
  while (retries > 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Connected to MongoDB');
      return;
    } catch (error) {
      console.error(`⚠️ MongoDB connection failed (${retries} retries left):`, error.message);
      retries--;

      if (retries === 0) {
        console.error("Could not connect to MongoDB after multiple attempts. Exiting...");
        process.exit(1);
      }

      console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

module.exports = connectDB;
