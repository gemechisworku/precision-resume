import { extractResumeData as extractOpenAI, analyzeResume as analyzeOpenAI, improveResumeData as improveOpenAI } from '../services/openaiService.js';
import { extractResumeData as extractGemini, analyzeResume as analyzeGemini, improveResumeData as improveGemini } from '../services/geminiService.js';
import logger from '../utils/logger.js';

/**
 * Determines which AI service to use based on available API keys.
 * Priority: OpenAI first, then Gemini.
 */
function getAvailableService() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (openaiKey && openaiKey.trim() !== '') {
    return 'openai';
  }
  if (geminiKey && geminiKey.trim() !== '') {
    return 'gemini';
  }
  return null;
}

/**
 * Extract resume data from text or file
 */
export async function extractResumeData(req, res) {
  const requestId = req.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = req.requestStartTime || Date.now();
  
  // Log immediately when function is called
  logger.info('=== Extract Request Received ===', { 
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    contentType: req.get('content-type'),
    contentLength: req.get('content-length')
  });
  
  try {
    logger.debug('Extract request details', { 
      requestId,
      method: req.method,
      path: req.path,
      headers: {
        contentType: req.get('content-type'),
        contentLength: req.get('content-length')
      },
      bodyKeys: Object.keys(req.body || {}),
      hasBody: !!req.body,
      bodyPreview: req.body ? JSON.stringify(req.body).substring(0, 500) : null
    });
    
    const { input } = req.body;
    
    if (!input) {
      logger.error('Missing input data in request body', {
        requestId,
        bodyKeys: Object.keys(req.body || {}),
        bodyType: typeof req.body,
        hasBody: !!req.body,
        bodyPreview: JSON.stringify(req.body).substring(0, 200)
      });
      return res.status(400).json({ error: 'Missing input data' });
    }

    logger.info('Input received', { 
      requestId,
      hasFile: !!input.file, 
      hasText: !!input.text,
      fileType: input.file?.mimeType,
      fileDataLength: input.file?.data?.length,
      textLength: input.text?.length
    });
    
    // Validate input
    if (!input.file && !input.text) {
      logger.error('No input provided - both file and text are missing', { requestId });
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'Either file or text input is required'
      });
    }
    
    if (input.file && !input.file.data) {
      logger.error('File provided but data is missing', { requestId });
      return res.status(400).json({ 
        error: 'Invalid file input',
        message: 'File data is required when providing a file'
      });
    }
    
    if (input.file && !input.file.mimeType) {
      logger.error('File provided but mimeType is missing', { requestId });
      return res.status(400).json({ 
        error: 'Invalid file input',
        message: 'File mimeType is required when providing a file'
      });
    }

    const service = getAvailableService();
    
    if (!service) {
      logger.error('No AI service available - check API keys');
      return res.status(500).json({ 
        error: 'No AI service available. Please set either OPENAI_API_KEY or GEMINI_API_KEY in your environment variables.' 
      });
    }

    logger.info(`Using service: ${service}`, {
      requestId,
      service: service
    });

    let result;
    try {
      logger.info(`Attempting extraction with service: ${service}`, {
        requestId,
        service: service,
        hasFile: !!input.file,
        hasText: !!input.text,
        fileType: input.file?.mimeType
      });
      
      if (service === 'openai') {
        result = await extractOpenAI(input);
      } else {
        result = await extractGemini(input);
      }
      
      logger.info(`Extraction result: ${result ? 'Success - data received' : 'Null result - no data returned'}`, {
        requestId,
        service: service,
        hasResult: !!result,
        resultType: result ? typeof result : 'null',
        resultKeys: result ? Object.keys(result) : []
      });
    } catch (error) {
      logger.error("AI service error", {
        requestId,
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
        stack: error.stack,
        service: service,
        name: error.name,
        inputType: input.file ? 'file' : input.text ? 'text' : 'unknown',
        fileType: input.file?.mimeType
      });
      // If OpenAI fails and Gemini is available, try fallback
      if (service === 'openai' && (process.env.GEMINI_API_KEY || process.env.API_KEY)) {
        logger.warn("OpenAI service failed, falling back to Gemini", { error: error.message });
        try {
          result = await extractGemini(input);
          logger.info("Fallback to Gemini succeeded");
        } catch (fallbackError) {
          logger.error("Both OpenAI and Gemini services failed", {
            originalError: error.message,
            fallbackError: fallbackError.message,
            stack: fallbackError.stack
          });
          return res.status(500).json({ 
            error: 'AI service error', 
            message: fallbackError.message || 'Both OpenAI and Gemini services failed',
            details: process.env.NODE_ENV === 'development' ? {
              originalError: error.message,
              fallbackError: fallbackError.message,
              stack: fallbackError.stack
            } : undefined
          });
        }
      } else {
        // Re-throw the error so it's caught by the outer catch block
        throw error;
      }
    }

    if (!result) {
      logger.error('=== EXTRACTION RETURNED NULL ===', {
        requestId,
        service: service,
        input: { 
          hasFile: !!input.file, 
          hasText: !!input.text,
          fileType: input.file?.mimeType,
          fileDataLength: input.file?.data?.length,
          fileDataPreview: input.file?.data ? input.file.data.substring(0, 50) + '...' : 'N/A',
          textLength: input.text?.length
        },
        possibleCauses: [
          'Invalid or missing API key',
          'API rate limit exceeded',
          'Service error (check OpenAI API status)',
          'Invalid input format',
          'Content filtering blocked the request'
        ]
      });
      
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: 'Failed to extract resume data',
          message: 'AI service returned null result. Check backend console for detailed error logs. Common causes: Invalid API key, rate limits, or service errors.'
        });
      } else {
        logger.warn('Cannot send error response - headers already sent', { requestId });
        return;
      }
    }

    const totalDuration = Date.now() - startTime;
    logger.info('Extraction successful', {
      requestId,
      service: service,
      totalDuration: `${totalDuration}ms`,
      experienceCount: result?.experience?.length,
      educationCount: result?.education?.length,
      certificationsCount: result?.certifications?.length,
      projectsCount: result?.projects?.length
    });
    
    res.json({ data: result });
  } catch (error) {
    logger.error('Extract error (outer catch)', {
      requestId,
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
      name: error.name,
      type: error.type
    });
    
    // Only send response if it hasn't been sent yet
    if (res.headersSent) {
      logger.warn('Response already sent, cannot send error response', { requestId });
      return;
    }
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Internal server error';
    if (error.message?.includes('API_KEY')) {
      errorMessage = 'OpenAI API key is missing or invalid. Please check your .env file.';
    } else if (error.status === 401 || error.code === 'invalid_api_key') {
      errorMessage = 'Invalid OpenAI API key. Please check your API key in the .env file.';
    } else if (error.status === 429) {
      errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('PDF')) {
      errorMessage = `PDF processing error: ${error.message}`;
    } else if (error.message?.includes('base64')) {
      errorMessage = 'Invalid file data format. Please ensure the file is properly encoded.';
    }
    
    res.status(500).json({ 
      error: 'Failed to extract resume data',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        originalMessage: error.message,
        stack: error.stack,
        code: error.code,
        status: error.status
      } : undefined
    });
  }
}

/**
 * Analyze resume for ATS compatibility
 */
export async function analyzeResume(req, res) {
  const requestId = req.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = req.requestStartTime || Date.now();
  
  logger.info('=== Analyze Request Received ===', {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    contentType: req.get('content-type'),
    contentLength: req.get('content-length')
  });
  
  try {
    logger.debug('Analyze request details', {
      requestId,
      bodyKeys: Object.keys(req.body || {}),
      hasData: !!req.body?.data,
      hasJobDescription: !!req.body?.jobDescription,
      jobDescriptionLength: req.body?.jobDescription?.length
    });
    
    const { data, jobDescription } = req.body;
    
    if (!data) {
      logger.error('Missing resume data in request body');
      return res.status(400).json({ error: 'Missing resume data' });
    }

    const service = getAvailableService();
    
    if (!service) {
      logger.error('No AI service available - check API keys');
      return res.status(500).json({ 
        error: 'No AI service available. Please set either OPENAI_API_KEY or GEMINI_API_KEY in your environment variables.' 
      });
    }

    logger.info(`Using service: ${service} for analysis`);

    let result;
    try {
      logger.info(`Attempting analysis with service: ${service}`);
      if (service === 'openai') {
        result = await analyzeOpenAI(data, jobDescription);
      } else {
        result = await analyzeGemini(data, jobDescription);
      }
      logger.info(`Analysis result: ${result ? 'Success - data received' : 'Null result - no data returned'}`);
    } catch (error) {
      logger.error("AI service error", {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
        stack: error.stack,
        service: service
      });
      // If OpenAI fails and Gemini is available, try fallback
      if (service === 'openai' && (process.env.GEMINI_API_KEY || process.env.API_KEY)) {
        logger.warn("OpenAI service failed, falling back to Gemini", { error: error.message });
        try {
          result = await analyzeGemini(data, jobDescription);
          logger.info("Fallback to Gemini succeeded");
        } catch (fallbackError) {
          logger.error("Both OpenAI and Gemini services failed", {
            originalError: error.message,
            fallbackError: fallbackError.message,
            stack: fallbackError.stack
          });
          return res.status(500).json({ 
            error: 'AI service error', 
            message: fallbackError.message,
            details: process.env.NODE_ENV === 'development' ? fallbackError.stack : undefined
          });
        }
      } else {
        throw error;
      }
    }

    if (!result) {
      logger.error('Analysis returned null result', { service: service });
      return res.status(500).json({ 
        error: 'Failed to analyze resume',
        message: 'AI service returned null result. Check API key and service availability.'
      });
    }

    const totalDuration = Date.now() - startTime;
    logger.info('Analysis successful', {
      requestId,
      service: service,
      totalDuration: `${totalDuration}ms`,
      finalScore: result?.final_score,
      categoryScores: result?.category_scores
    });
    
    res.json({ data: result });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error('Analyze error (outer catch)', {
      requestId,
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status,
      totalDuration: `${totalDuration}ms`
    });
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Internal server error';
    if (error.message?.includes('API_KEY')) {
      errorMessage = 'OpenAI API key is missing or invalid. Please check your .env file.';
    } else if (error.status === 401 || error.code === 'invalid_api_key') {
      errorMessage = 'Invalid OpenAI API key. Please check your API key in the .env file.';
    } else if (error.status === 429) {
      errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
    }
    
    res.status(500).json({ 
      error: 'Internal server error', 
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        originalMessage: error.message,
        stack: error.stack,
        code: error.code,
        status: error.status
      } : undefined
    });
  }
}

/**
 * Improve resume content using AI
 */
export async function improveResumeData(req, res) {
  const requestId = req.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = req.requestStartTime || Date.now();
  
  logger.info('=== Improve Request Received ===', {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    contentType: req.get('content-type'),
    contentLength: req.get('content-length')
  });
  
  try {
    logger.debug('Improve request details', {
      requestId,
      bodyKeys: Object.keys(req.body || {}),
      hasData: !!req.body?.data,
      hasJobDescription: !!req.body?.jobDescription,
      jobDescriptionLength: req.body?.jobDescription?.length,
      experienceCount: req.body?.data?.experience?.length,
      educationCount: req.body?.data?.education?.length
    });
    
    const { data, jobDescription } = req.body;
    
    if (!data) {
      logger.error('Missing resume data in request body');
      return res.status(400).json({ error: 'Missing resume data' });
    }

    const service = getAvailableService();
    
    if (!service) {
      logger.error('No AI service available - check API keys');
      return res.status(500).json({ 
        error: 'No AI service available. Please set either OPENAI_API_KEY or GEMINI_API_KEY in your environment variables.' 
      });
    }

    logger.info(`Using service: ${service} for improvement`);

    let result;
    try {
      logger.info(`Attempting improvement with service: ${service}`);
      if (service === 'openai') {
        result = await improveOpenAI(data, jobDescription);
      } else {
        result = await improveGemini(data, jobDescription);
      }
      logger.info(`Improvement result: ${result ? 'Success - data received' : 'Null result - no data returned'}`);
    } catch (error) {
      logger.error("AI service error", {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
        stack: error.stack,
        service: service
      });
      // If OpenAI fails and Gemini is available, try fallback
      if (service === 'openai' && (process.env.GEMINI_API_KEY || process.env.API_KEY)) {
        logger.warn("OpenAI service failed, falling back to Gemini", { error: error.message });
        try {
          result = await improveGemini(data, jobDescription);
          logger.info("Fallback to Gemini succeeded");
        } catch (fallbackError) {
          logger.error("Both OpenAI and Gemini services failed", {
            originalError: error.message,
            fallbackError: fallbackError.message,
            stack: fallbackError.stack
          });
          return res.status(500).json({ 
            error: 'AI service error', 
            message: fallbackError.message 
          });
        }
      } else {
        throw error;
      }
    }

    if (!result) {
      logger.error('Improvement returned null result', { service: service });
      return res.status(500).json({ 
        error: 'Failed to improve resume',
        message: 'AI service returned null result. Check backend console for detailed error logs.'
      });
    }

    const totalDuration = Date.now() - startTime;
    logger.info('Improvement successful', {
      requestId,
      service: service,
      totalDuration: `${totalDuration}ms`,
      experienceCount: result?.experience?.length,
      educationCount: result?.education?.length
    });
    
    res.json({ data: result });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error('Improve error (outer catch)', {
      requestId,
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
      totalDuration: `${totalDuration}ms`
    });
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    } else {
      logger.warn('Response already sent, cannot send error response', { requestId });
    }
  }
}

