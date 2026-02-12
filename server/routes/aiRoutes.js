import { extractResumeData as extractOpenAI, analyzeResume as analyzeOpenAI, improveResumeData as improveOpenAI } from '../services/openaiService.js';
import { extractResumeData as extractGemini, analyzeResume as analyzeGemini, improveResumeData as improveGemini } from '../services/geminiService.js';

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
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Missing input data' });
    }

    const service = getAvailableService();
    
    if (!service) {
      return res.status(500).json({ 
        error: 'No AI service available. Please set either OPENAI_API_KEY or GEMINI_API_KEY in your environment variables.' 
      });
    }

    let result;
    try {
      if (service === 'openai') {
        result = await extractOpenAI(input);
      } else {
        result = await extractGemini(input);
      }
    } catch (error) {
      // If OpenAI fails and Gemini is available, try fallback
      if (service === 'openai' && (process.env.GEMINI_API_KEY || process.env.API_KEY)) {
        console.warn("OpenAI service failed, falling back to Gemini:", error);
        try {
          result = await extractGemini(input);
        } catch (fallbackError) {
          console.error("Both OpenAI and Gemini services failed:", fallbackError);
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
      return res.status(500).json({ error: 'Failed to extract resume data' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Extract error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

/**
 * Analyze resume for ATS compatibility
 */
export async function analyzeResume(req, res) {
  try {
    const { data, jobDescription } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Missing resume data' });
    }

    const service = getAvailableService();
    
    if (!service) {
      return res.status(500).json({ 
        error: 'No AI service available. Please set either OPENAI_API_KEY or GEMINI_API_KEY in your environment variables.' 
      });
    }

    let result;
    try {
      if (service === 'openai') {
        result = await analyzeOpenAI(data, jobDescription);
      } else {
        result = await analyzeGemini(data, jobDescription);
      }
    } catch (error) {
      console.error("AI service error:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      });
      // If OpenAI fails and Gemini is available, try fallback
      if (service === 'openai' && (process.env.GEMINI_API_KEY || process.env.API_KEY)) {
        console.warn("OpenAI service failed, falling back to Gemini:", error);
        try {
          result = await analyzeGemini(data, jobDescription);
        } catch (fallbackError) {
          console.error("Both OpenAI and Gemini services failed:", fallbackError);
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
      console.error('Analysis returned null result');
      return res.status(500).json({ 
        error: 'Failed to analyze resume',
        message: 'AI service returned null result. Check API key and service availability.'
      });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Analyze error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    
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
  try {
    const { data, jobDescription } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Missing resume data' });
    }

    const service = getAvailableService();
    
    if (!service) {
      return res.status(500).json({ 
        error: 'No AI service available. Please set either OPENAI_API_KEY or GEMINI_API_KEY in your environment variables.' 
      });
    }

    let result;
    try {
      if (service === 'openai') {
        result = await improveOpenAI(data, jobDescription);
      } else {
        result = await improveGemini(data, jobDescription);
      }
    } catch (error) {
      // If OpenAI fails and Gemini is available, try fallback
      if (service === 'openai' && (process.env.GEMINI_API_KEY || process.env.API_KEY)) {
        console.warn("OpenAI service failed, falling back to Gemini:", error);
        try {
          result = await improveGemini(data, jobDescription);
        } catch (fallbackError) {
          console.error("Both OpenAI and Gemini services failed:", fallbackError);
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
      return res.status(500).json({ error: 'Failed to improve resume' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Improve error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

