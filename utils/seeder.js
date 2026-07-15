const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // or bcrypt
const crypto = require('crypto');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    let name = process.env.DEFAULT_ADMIN_NAME;
    let email = process.env.DEFAULT_ADMIN_EMAIL;
    let password = process.env.DEFAULT_ADMIN_PASSWORD;

    if (!name || !email || !password) {
      console.log("\n========================================================");
      console.log("WARNING: DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL, or DEFAULT_ADMIN_PASSWORD missing in environment variables.");
      if (process.env.NODE_ENV === 'development') {
        console.log("Falling back to default admin credentials because we are in development mode.");
        name = name || 'System Administrator';
        email = email || 'admin@gmail.com';
        password = password || 'Admin@123';
      } else {
        console.log("ERROR: Cannot create default admin without credentials. Please set environment variables.");
        console.log("========================================================\n");
        return;
      }
      console.log("========================================================\n");
    }

    let existingAdmin = await User.findOne({ email: email }).select('+password');
    if (!existingAdmin) {
      existingAdmin = await User.findOne({ role: 'admin' }).select('+password');
    }

    if (existingAdmin) {
      const isMatch = await bcrypt.compare(password, existingAdmin.password);
      if (!isMatch) {
        console.log("\n========================================================");
        console.log(`WARNING: Admin account (${existingAdmin.email}) already exists, but the password hash does not match!`);
        console.log("Duplicate admin creation aborted.");
        console.log("To repair or recreate this account, delete the admin document directly in MongoDB or run a script to reset the password.");
        console.log("========================================================\n");
      } else {
        console.log(`Admin account (${existingAdmin.email}) already exists and credentials are valid.`);
      }
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      fullName: name,
      email: email,
      password: hashedPassword,
      role: 'admin',
      nationalId: '0000000000000', // required by schema, min length 13
      isVerified: true,
      status: 'verified',
      faceEncodings: [0], // dummy encoding so login doesn't fail on length check
      faceRegistered: true
    });

    console.log(`Default admin created successfully with email: ${email}`);
  } catch (error) {
    console.error("Error seeding admin:", error.message);
  }
};

module.exports = seedAdmin;
