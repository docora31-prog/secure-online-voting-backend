require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/secure-online-voting-system');
    
    // Delete duplicate test admins
    const result = await User.deleteMany({ email: { $in: ['testlock@example.com', 'testadmin2@example.com'] } });
    console.log(`Deleted ${result.deletedCount} duplicate test admins.`);

    // Fix status of main admin
    const update = await User.updateOne({ email: 'admin@securevoting.com' }, { $set: { status: 'verified' } });
    console.log(`Updated status of main admin.`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

cleanup();
