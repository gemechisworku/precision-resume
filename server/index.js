import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { extractResumeData, analyzeResume, improveResumeData } from './routes/aiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
    }
  });
});

// AI API routes
app.post('/api/ai/extract', extractResumeData);
app.post('/api/ai/analyze', analyzeResume);
app.post('/api/ai/improve', improveResumeData);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoints available at http://localhost:${PORT}/api/ai/*`);
});

