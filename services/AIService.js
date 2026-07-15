const axios = require('axios');
const Setting = require('../models/Setting');

class AIService {
  constructor() {
    this.timeout = 60000; // Increased to 60 seconds after CPU optimization
  }

  async getClient() {
    const setting = await Setting.findOne();
    // NOTE: The AI Service URL is configured dynamically via the Admin Settings in MongoDB, 
    // rather than using a static process.env.AI_SERVICE_URL environment variable.
    const baseURL = setting?.aiServiceUrl;
    
    if (!baseURL) {
      throw new Error('AI Service URL is not configured. Please configure it via the startup setup modal.');
    }
    
    return axios.create({
      baseURL: baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async handleRequest(method, endpoint, data = {}) {
    try {
      const client = await this.getClient();
      const response = await client[method](endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error, endpoint);
    }
  }

  handleError(error, endpoint) {
    if (error.message === 'AI Service URL is not configured. Please configure it via the startup setup modal.') {
      throw error;
    }
    
    if (error.response) {
      // The request was made and the server responded with a non-2xx status code
      const errMsg = error.response.data.message || error.response.data.error || `AI Service Error on ${endpoint}: ${error.response.status}`;
      throw new Error(errMsg);
    } else if (error.request) {
      // The request was made but no response was received (e.g. timeout)
      throw new Error(`AI Service timeout or no response on ${endpoint}`);
    } else {
      // Something happened in setting up the request
      throw new Error(`AI Service connection error on ${endpoint}: ${error.message}`);
    }
  }

  /**
   * testConnection — test the connection to a specific base URL
   */
  async testConnection(url) {
    const client = axios.create({
      baseURL: url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    const response = await client.get('/ping');
    return response.data;
  }

  /**
   * registerFace — payload is already a full object built by AuthenticationService:
   *   { image: <base64 string>, minimumFaceSize, minimumBrightness, ... }
   * Pass it directly; do NOT re-wrap it.
   */
  async registerFace(payload) {
    return this.handleRequest('post', '/register-face', payload);
  }

  /**
   * verifyFace — payload is already a full object built by AuthenticationService:
   *   { image: <base64 string>, stored_embeddings: [...], verificationThreshold, ... }
   * Pass it directly; do NOT re-wrap it.
   */
  async verifyFace(payload) {
    return this.handleRequest('post', '/verify-face', payload);
  }

  async fraudCheck(data) {
    return this.handleRequest('post', '/fraud-check', data);
  }

  async chat(question) {
    return this.handleRequest('post', '/chat', { question });
  }

  async candidateSummary(manifesto) {
    return this.handleRequest('post', '/candidate-summary', { manifesto });
  }

  async validateEmail(email) {
    return this.handleRequest('post', '/validate-email', { email });
  }
}

module.exports = new AIService();
