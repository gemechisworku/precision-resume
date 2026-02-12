import { ResumeData, ATSAnalysisResult } from "../types";

export interface ExtractionInput {
  text?: string;
  file?: {
    data: string; // base64
    mimeType: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Extract resume data from text or file via backend API
 */
export async function extractResumeData(input: ExtractionInput): Promise<ResumeData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to extract resume data');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Extract error:', error);
    throw error;
  }
}

/**
 * Analyze resume for ATS compatibility via backend API
 */
export async function analyzeResume(data: ResumeData, jobDescription?: string): Promise<ATSAnalysisResult | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, jobDescription }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to analyze resume';
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
        console.error('Backend error response:', error);
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Analyze error:', error);
    throw error;
  }
}

/**
 * Improve resume content using AI via backend API
 */
export async function improveResumeData(data: ResumeData, jobDescription?: string): Promise<ResumeData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/improve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, jobDescription }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to improve resume');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Improve error:', error);
    throw error;
  }
}
