import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { extractResumeData, analyzeResume, improveResumeData } from './routes/aiRoutes.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    name: error.name
  });
  // Don't exit - let the server continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
  // Don't exit - let the server continue
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS with explicit configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Log all incoming requests at the very beginning (before any processing)
app.use((req, res, next) => {
  // Log immediately when request arrives
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Content-Type: ${req.get('content-type')}`);
  next();
});

// JSON parsing with error handling
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 file uploads
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.error('JSON parsing error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      contentType: req.get('content-type'),
      contentLength: req.get('content-length')
    });
    return res.status(400).json({ 
      error: 'Invalid JSON', 
      message: 'Request body contains invalid JSON' 
    });
  }
  next();
});

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware (must be before routes)
app.use((req, res, next) => {
  // Skip logging for health checks to reduce noise
  if (req.path === '/health') {
    return next();
  }
  
  const requestStartTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  req.requestStartTime = requestStartTime;
  
  // Log immediately - this should always appear (both console and file)
  const logData = {
    requestId,
    method: req.method,
    path: req.path,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    contentLength: req.get('content-length'),
    query: req.query,
    timestamp: new Date().toISOString()
  };
  
  // Log to both console (for immediate visibility) and file
  console.log(`[REQUEST] ${req.method} ${req.path}`, logData);
  logger.info('Incoming HTTP Request', logData);
  
  // Log response when it's sent
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    const duration = Date.now() - requestStartTime;
    logger.info('HTTP Response Sent (send)', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      hasData: !!data
    });
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    const duration = Date.now() - requestStartTime;
    logger.info('HTTP Response Sent (json)', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      hasData: !!data,
      dataType: data ? typeof data : 'null'
    });
    return originalJson.call(this, data);
  };
  
  // Log any errors that occur
  res.on('finish', () => {
    const duration = Date.now() - requestStartTime;
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request completed with error status', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    }
  });
  
  next();
});

// Health check
app.get('/health', (req, res) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.API_KEY);
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    apiKeys: {
      openai: hasOpenAI ? 'configured' : 'missing',
      gemini: hasGemini ? 'configured' : 'missing'
    },
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify requests are reaching the server
app.post('/api/test', (req, res) => {
  logger.info('Test endpoint called', { 
    body: req.body,
    headers: req.headers,
    method: req.method,
    path: req.path
  });
  res.json({ 
    status: 'ok', 
    message: 'Test endpoint is working',
    receivedBody: req.body,
    receivedHeaders: {
      'content-type': req.get('content-type'),
      'origin': req.get('origin'),
      'user-agent': req.get('user-agent')
    },
    timestamp: new Date().toISOString()
  });
});

// CORS preflight handler - handle OPTIONS requests for all /api/ai routes
app.use('/api/ai', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    logger.info('CORS preflight request', {
      origin: req.get('origin'),
      method: req.method,
      path: req.path
    });
    res.header('Access-Control-Allow-Origin', req.get('origin') || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(200);
  }
  next();
});

// AI API routes with error wrapper
app.post('/api/ai/extract', async (req, res, next) => {
  const requestId = req.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Extract route handler called', {
    requestId,
    path: req.path,
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    contentType: req.get('content-type')
  });
  
  try {
    await extractResumeData(req, res);
  } catch (error) {
    // Only send error response if response hasn't been sent yet
    if (!res.headersSent) {
      logger.error('Unhandled error in extract route wrapper', {
        requestId,
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        status: error.status,
        type: error.type,
        path: req.path,
        method: req.method,
        hasBody: !!req.body,
        bodyPreview: req.body ? JSON.stringify(req.body).substring(0, 500) : null
      });
      res.status(500).json({ 
        error: 'Failed to extract resume data',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          code: error.code,
          status: error.status,
          name: error.name
        } : undefined
      });
    } else {
      logger.error('Error occurred after response was sent', {
        requestId,
        error: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }
});
app.post('/api/ai/analyze', async (req, res, next) => {
  const requestId = req.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Analyze route handler called', {
    requestId,
    path: req.path,
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    contentType: req.get('content-type')
  });
  
  try {
    await analyzeResume(req, res);
  } catch (error) {
    if (!res.headersSent) {
      logger.error('Unhandled error in analyze route wrapper', {
        requestId,
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        status: error.status,
        type: error.type,
        path: req.path,
        method: req.method,
        hasBody: !!req.body,
        bodyPreview: req.body ? JSON.stringify(req.body).substring(0, 500) : null
      });
      res.status(500).json({ 
        error: 'Failed to analyze resume',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          code: error.code,
          status: error.status,
          name: error.name
        } : undefined
      });
    } else {
      logger.error('Error occurred after response was sent', {
        requestId,
        error: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }
});

app.post('/api/ai/improve', async (req, res, next) => {
  const requestId = req.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Improve route handler called', {
    requestId,
    path: req.path,
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    contentType: req.get('content-type')
  });
  
  try {
    await improveResumeData(req, res);
  } catch (error) {
    if (!res.headersSent) {
      logger.error('Unhandled error in improve route wrapper', {
        requestId,
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        status: error.status,
        type: error.type,
        path: req.path,
        method: req.method,
        hasBody: !!req.body,
        bodyPreview: req.body ? JSON.stringify(req.body).substring(0, 500) : null
      });
      res.status(500).json({ 
        error: 'Failed to improve resume',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          code: error.code,
          status: error.status,
          name: error.name
        } : undefined
      });
    } else {
      logger.error('Error occurred after response was sent', {
        requestId,
        error: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log('='.repeat(60));
  
  logger.info(`🚀 Backend server running on http://localhost:${PORT}`);
  logger.info(`📝 API endpoints available at http://localhost:${PORT}/api/ai/*`);
  
  // Diagnostic info
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.API_KEY);
  logger.info(`📋 API Key Status:`, {
    openai: hasOpenAI ? 'configured' : 'missing',
    gemini: hasGemini ? 'configured' : 'missing'
  });
  
  if (!hasOpenAI && !hasGemini) {
    logger.warn(`⚠️  WARNING: No API keys found! Set OPENAI_API_KEY or GEMINI_API_KEY in .env file`);
  }
  
  logger.info('Backend server initialized successfully');
});

// Handle server errors
server.on('error', (error) => {
  console.error('SERVER ERROR:', error);
  logger.error('Server Error', {
    error: error.message,
    stack: error.stack,
    code: error.code
  });
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

