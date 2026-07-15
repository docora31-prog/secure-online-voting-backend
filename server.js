require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedAdmin = require('./utils/seeder');

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  console.error('The server cannot start securely without a secret for signing tokens.');
  process.exit(1);
}

// Connect to Database, then start server
connectDB().then(async () => {
  // Seed default admin if not exists
  await seedAdmin();
  
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});
