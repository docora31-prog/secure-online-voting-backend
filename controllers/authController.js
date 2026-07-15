const authService = require('../services/AuthenticationService');
exports.register = async (req, res) => {
  try {
    const tStart = process.hrtime();
    const result = await authService.register(req.body);
    
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    const tEnd = process.hrtime(tStart);
    const total_ms = (tEnd[0] * 1000) + (tEnd[1] / 1e6);
    const profiling = result.profiling || {};
    profiling.total_registration_ms = parseFloat(total_ms.toFixed(2));
    
    console.log('\n--- REGISTRATION PERFORMANCE REPORT ---');
    console.log(JSON.stringify(profiling, null, 2));
    console.log('---------------------------------------\n');

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful. Your account is pending administrator approval.',
      data: { user: result.user },
      profiling: profiling
    });
  } catch (error) {
    console.error('Backend exception during registration:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, image, isAdminLogin } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const device = req.headers['user-agent'] || 'unknown';
    const result = await authService.login(email, password, image, isAdminLogin, ipAddress, device);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (error) {
    if (error.isLocked) {
      return res.status(423).json({ success: false, message: error.message });
    }
    if (error.isFaceVerificationFailure) {
      return res.status(403).json(error.payload);
    }
    if (error.isPendingApproval) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_PENDING_APPROVAL",
        message: error.message
      });
    }
    res.status(401).json({ success: false, message: error.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token provided' });
    
    const result = await authService.refreshToken(token);
    
    res.status(200).json({ success: true, data: { accessToken: result.accessToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const otpCode = await authService.forgotPassword(email);
    // Note: Do not return OTP in production. Here for testing.
    res.status(200).json({ success: true, message: 'OTP sent to email', data: { otpCode } });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otpCode, purpose } = req.body;
    await authService.verifyOTP(email, otpCode, purpose);
    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;
    await authService.resetPassword(email, otpCode, newPassword);
    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
