const AIService = require('./AIService');

class FaceVerificationService {
  /**
   * Performs face verification for a user against their stored embeddings.
   * Handles building the payload, calling AIService, and updating user failure/success history.
   * 
   * @param {Object} user - The mongoose user document (must have faceEmbeddings/faceEncodings selected)
   * @param {String} image - The base64 image data
   * @param {Object} setting - The dynamic application settings
   * @param {String} ipAddress - The IP address of the request
   * @param {String} device - The user-agent device string
   * @returns {Object} { success: boolean, message: string, userUpdated: boolean, isFlaggedNow: boolean }
   */
  async verifyUserFace(user, image, setting, ipAddress = 'unknown', device = 'unknown', options = {}) {
    if (!image) {
      throw new Error('Face image is required for verification');
    }

    const storedEmbeddings = (user.faceEmbeddings && user.faceEmbeddings.length > 0) 
      ? user.faceEmbeddings 
      : (user.faceEncodings && user.faceEncodings.length > 0 ? [user.faceEncodings] : []);

    if (storedEmbeddings.length === 0) {
      throw new Error('No registered face found for this user. Please register first.');
    }

    const maxFaceAttempts = setting?.maxFaceVerificationAttempts ?? 3;
    const faceRiskInc = setting?.faceVerificationRiskIncrement ?? 20;
    const scoreThreshold = setting?.fraudScoreThreshold ?? 60;

    let aiResult;
    try {
      const payload = {
        image: image,
        stored_embeddings: storedEmbeddings,
        verificationThreshold: setting?.verificationThreshold,
        distanceMetric: setting?.distanceMetric,
        minimumFaceSize: setting?.minimumFaceSize,
        minimumBrightness: setting?.minimumBrightness,
        maximumBrightness: setting?.maximumBrightness,
        blurThreshold: setting?.blurThreshold,
        modelName: setting?.modelName,
        detectorBackend: setting?.detectorBackend
      };
      aiResult = await AIService.verifyFace(payload);
    } catch (error) {
      aiResult = { verified: false, message: error.message || 'Face verification failed' };
    }

    if (!aiResult || !aiResult.verified) {
      user.failedFaceAttempts = (user.failedFaceAttempts || 0) + 1;
      user.fraudRiskScore = (user.fraudRiskScore || 0) + faceRiskInc;
      user.lastFailedFaceAttempt = new Date();
      
      const failureReason = aiResult?.message || 'Confidence too low.';
      
      user.faceVerificationHistory.push({
        timestamp: new Date(),
        success: false,
        reason: failureReason,
        ipAddress,
        device,
        riskScoreChange: faceRiskInc,
        confidence: aiResult?.confidence,
        distance: aiResult?.bestDistance,
        qualityScore: aiResult?.qualityScore,
        matchedEmbedding: aiResult?.matchedEmbedding
      });
      
      let isFlaggedNow = false;
      const context = options.context || 'Verification';
      const electionId = options.electionId;

      if (!user.isFlagged && (user.failedFaceAttempts >= maxFaceAttempts || user.fraudRiskScore >= scoreThreshold)) {
        user.isFlagged = true;
        user.status = 'flagged';
        user.flagReason = `Repeated Face Verification Failures${context === 'Voting' ? ' During Voting' : ''}`;
        isFlaggedNow = true;
      }
      
      await user.save();
      
      if (isFlaggedNow) {
        const auditService = require('./auditService');
        await auditService.logAction({
          action: 'ACCOUNT_TEMPORARILY_FLAGGED',
          actorId: user._id,
          actorModel: 'User',
          targetId: electionId || user._id,
          targetModel: electionId ? 'Election' : 'User',
          details: { 
            reason: user.flagReason, 
            failureCount: user.failedFaceAttempts,
            device: device,
            electionId: electionId
          },
          ipAddress
        });
      }
      
      const errorMessage = isFlaggedNow 
        ? "Your account has been temporarily flagged due to repeated failed face verification attempts. Please contact the election administrator." 
        : `Face verification failed. ${failureReason}`;
        
      let errorCode = 'FACE_VERIFICATION_FAILED';
      const lowerReason = failureReason.toLowerCase();
      if (lowerReason.includes('no face') || lowerReason.includes('could not find face')) {
        errorCode = 'FACE_NOT_DETECTED';
      } else if (lowerReason.includes('multiple face')) {
        errorCode = 'MULTIPLE_FACES_DETECTED';
      } else if (lowerReason.includes('blur')) {
        errorCode = 'IMAGE_TOO_BLURRY';
      } else if (lowerReason.includes('timeout') || lowerReason.includes('unavailable') || lowerReason.includes('connection error')) {
        errorCode = 'AI_SERVICE_UNAVAILABLE';
      }

      return {
        success: false,
        message: errorMessage,
        errorCode: errorCode,
        isFlagged: user.isFlagged,
        failedAttempts: user.failedFaceAttempts,
        remainingAttempts: Math.max(0, maxFaceAttempts - user.failedFaceAttempts),
        fraudRiskScore: user.fraudRiskScore
      };
    }

    // Success
    user.failedFaceAttempts = 0;
    user.lastSuccessfulFaceVerification = new Date();
    user.faceVerificationHistory.push({
      timestamp: new Date(),
      success: true,
      reason: 'Verified successfully',
      ipAddress,
      device,
      riskScoreChange: 0,
      confidence: aiResult?.confidence,
      distance: aiResult?.bestDistance,
      qualityScore: aiResult?.qualityScore,
      matchedEmbedding: aiResult?.matchedEmbedding
    });
    
    // Caller should save() user if they make other changes, but we save here just in case
    await user.save();

    return {
      success: true,
      message: 'Verified successfully'
    };
  }
}

module.exports = new FaceVerificationService();
