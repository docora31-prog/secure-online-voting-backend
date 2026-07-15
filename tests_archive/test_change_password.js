require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const AuthenticationService = require('../services/AuthenticationService');
const bcrypt = require('bcryptjs');

async function runTest() {
  let testUsers = [];
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Setup
    await User.deleteMany({ email: 'testpassword@example.com' });
    await Session.deleteMany({});
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('CurrentPass123!', salt);
    const user = await User.create({
      nationalId: '1234567890987',
      fullName: 'Test Password',
      email: 'testpassword@example.com',
      password: hashedPassword,
      faceRegistered: true,
      role: 'voter',
      status: 'verified',
      isVerified: true
    });
    testUsers.push(user._id);

    // Create a mock session
    await Session.create({
      userId: user._id,
      tokenHash: 'dummyhash',
      expiresAt: new Date(Date.now() + 100000)
    });

    console.log('Testing incorrect current password...');
    try {
      await AuthenticationService.changePassword(user._id, 'WrongPass123!', 'NewPass123!', '127.0.0.1', 'test-device');
      console.error('ERROR: Allowed change with incorrect current password.');
    } catch (err) {
      if (err.message.includes('incorrect')) {
        console.log('SUCCESS: Blocked incorrect current password.');
      } else {
        console.error('ERROR: Wrong error message: ', err.message);
      }
    }

    console.log('Testing same new password as current...');
    try {
      await AuthenticationService.changePassword(user._id, 'CurrentPass123!', 'CurrentPass123!', '127.0.0.1', 'test-device');
      console.error('ERROR: Allowed change with same password.');
    } catch (err) {
      if (err.message.includes('same')) {
        console.log('SUCCESS: Blocked same password.');
      } else {
        console.error('ERROR: Wrong error message: ', err.message);
      }
    }

    console.log('Testing successful password change...');
    try {
      await AuthenticationService.changePassword(user._id, 'CurrentPass123!', 'NewStrongPass123@', '127.0.0.1', 'test-device');
      console.log('SUCCESS: Password changed.');
    } catch (err) {
      console.error('ERROR: Failed to change password: ', err.message);
    }

    // Verify DB state
    const updatedUser = await User.findById(user._id).select('+password +passwordChangedAt');
    const isMatch = await bcrypt.compare('NewStrongPass123@', updatedUser.password);
    if (isMatch) {
      console.log('SUCCESS: Password correctly hashed and updated in DB.');
    } else {
      console.error('ERROR: Password not updated in DB.');
    }

    if (updatedUser.passwordChangedAt) {
      console.log('SUCCESS: passwordChangedAt was set.');
    } else {
      console.error('ERROR: passwordChangedAt was NOT set.');
    }

    // Verify Sessions invalidated
    const activeSessions = await Session.find({ userId: user._id, isValid: true });
    if (activeSessions.length === 0) {
      console.log('SUCCESS: Sessions were invalidated.');
    } else {
      console.error('ERROR: Sessions were NOT invalidated.');
    }

    // Verify Audit Log
    const auditLogs = await AuditLog.find({ action: 'PASSWORD_CHANGED', actorId: user._id });
    if (auditLogs.length > 0) {
      console.log('SUCCESS: Audit Log was created.');
      console.log(`Log IP: ${auditLogs[0].ipAddress}, Device: ${auditLogs[0].details.device}`);
    } else {
      console.error('ERROR: Audit Log was NOT created.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    console.log('\nCleaning up test data...');
    if (testUsers.length > 0) {
      await User.deleteMany({ _id: { $in: testUsers } });
      await Session.deleteMany({ userId: { $in: testUsers } });
      await AuditLog.deleteMany({ actorId: { $in: testUsers }, action: 'PASSWORD_CHANGED' });
    }
    await mongoose.connection.close();
  }
}

runTest();
