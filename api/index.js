const app = require('../app');
const connectDB = require('../config/db');

// In serverless environments, connect to DB outside the request handler
// This allows the connection to be cached across invocations.
connectDB();

module.exports = app;
