import { logRequest } from '../utils/devLogger.js';

// Middleware to log all HTTP requests
export function requestLoggerMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Store original res.json and res.status methods
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);
  
  let statusCode = 200;
  let capturedError = null;
  
  // Override res.status to capture status code
  res.status = function(code) {
    statusCode = code;
    return originalStatus(code);
  };
  
  // Override res.json to log after response is sent
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // If response has error property, capture it
    if (data && data.error) {
      capturedError = { message: data.error };
    }
    
    // Log the request with all details
    logRequest(req, res, responseTime, statusCode, capturedError);
    
    return originalJson(data);
  };
  
  // Handle errors
  res.on('finish', () => {
    // If response was sent without json() being called
    if (!res.headersSent) {
      const responseTime = Date.now() - startTime;
      logRequest(req, res, responseTime, res.statusCode, capturedError);
    }
  });
  
  next();
}
