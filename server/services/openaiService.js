import OpenAI from "openai";
import logger from '../utils/logger.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const pdfParse = PDFParse;

const getAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
};

// JSON Schema for resume extraction (OpenAI strict mode requires additionalProperties: false and all properties in required)
const resumeSchema = {
  type: "object",
  properties: {
    profile: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        location: { type: "string" },
        website: { type: "string" },
        linkedin: { type: "string" },
      },
      required: ["fullName", "phone", "email", "location", "website", "linkedin"],
      additionalProperties: false,
    },
    summary: { type: "string" },
    technicalStrengths: {
      type: "array",
      items: { type: "string" },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          location: { type: "string" },
          period: { type: "string" },
          bullets: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["company", "title", "location", "period", "bullets"],
        additionalProperties: false,
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          qualification: { type: "string" },
          period: { type: "string" },
          details: { type: "string" },
        },
        required: ["institution", "qualification", "period", "details"],
        additionalProperties: false,
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          date: { type: "string" },
        },
        required: ["name", "issuer", "date"],
        additionalProperties: false,
      }
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          associatedWith: { type: "string" },
          technologies: {
            type: "array",
            items: { type: "string" }
          },
        },
        required: ["title", "description", "associatedWith", "technologies"],
        additionalProperties: false,
      }
    },
    languages: {
      type: "array",
      items: { type: "string" },
    },
    references: { type: "string" },
  },
  required: ["profile", "summary", "technicalStrengths", "experience", "education", "certifications", "projects", "languages", "references"],
  additionalProperties: false,
};

const atsAnalysisSchema = {
  type: "object",
  properties: {
    final_score: { type: "number" },
    category_scores: {
      type: "object",
      properties: {
        keyword_alignment: { type: "number" },
        content_impact: { type: "number" },
        formatting_compliance: { type: "number" },
        experience_depth: { type: "number" },
        language_quality: { type: "number" },
      },
      required: ["keyword_alignment", "content_impact", "formatting_compliance", "experience_depth", "language_quality"],
      additionalProperties: false,
    },
    sub_scores: {
      type: "object",
      properties: {
        A1_required_skill_match: { type: "number" },
        A2_secondary_skill_coverage: { type: "number" },
        A3_keyword_naturalness: { type: "number" },
        A4_role_title_alignment: { type: "number" },
        B1_action_verbs: { type: "number" },
        B2_quantification: { type: "number" },
        B3_outcome_orientation: { type: "number" },
        B4_relevance_filtering: { type: "number" },
        C1_standard_headings: { type: "number" },
        C2_ats_safe_structure: { type: "number" },
        C3_date_consistency: { type: "number" },
        C4_bullet_clarity: { type: "number" },
        D1_skill_in_context: { type: "number" },
        D2_leadership_signals: { type: "number" },
        D3_career_progression: { type: "number" },
        E1_grammar: { type: "number" },
        E2_tense_consistency: { type: "number" },
        E3_conciseness: { type: "number" },
      },
      required: ["A1_required_skill_match", "A2_secondary_skill_coverage", "A3_keyword_naturalness", "A4_role_title_alignment", "B1_action_verbs", "B2_quantification", "B3_outcome_orientation", "B4_relevance_filtering", "C1_standard_headings", "C2_ats_safe_structure", "C3_date_consistency", "C4_bullet_clarity", "D1_skill_in_context", "D2_leadership_signals", "D3_career_progression", "E1_grammar", "E2_tense_consistency", "E3_conciseness"],
      additionalProperties: false,
    },
    deductions_applied: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reason: { type: "string" },
          points: { type: "number" },
        },
        required: ["reason", "points"],
        additionalProperties: false,
      }
    },
    improvement_recommendations: {
      type: "array",
      items: { type: "string" }
    },
    keyword_gap_list: {
      type: "array",
      items: { type: "string" }
    },
    missing_required_skills: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["final_score", "category_scores", "sub_scores", "deductions_applied", "improvement_recommendations", "keyword_gap_list", "missing_required_skills"],
  additionalProperties: false,
};

export async function extractResumeData(input) {
  const operationId = `extract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  logger.info('OpenAI extractResumeData called', {
    operationId,
    hasFile: !!input.file,
    hasText: !!input.text,
    fileType: input.file?.mimeType,
    fileDataLength: input.file?.data?.length,
    textLength: input.text?.length
  });
  
  const client = getAI();
  const startTime = Date.now();
  let apiDuration = 0;
  try {
    let textContent = input.text;
    let isPdf = input.file && input.file.mimeType === 'application/pdf';
    let pdfSentDirectly = false;
    
    // Handle PDF files - try text extraction first, fall back to direct file upload
    if (isPdf) {
      logger.info('Processing PDF file', {
        dataLength: input.file.data?.length,
        hasData: !!input.file.data
      });
      
      if (!input.file.data) {
        throw new Error('PDF file data is missing or empty');
      }
      
      // Try text extraction first
      try {
        let base64Data = input.file.data;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        if (pdfBuffer.length > 0) {
          const parser = new pdfParse({ data: pdfBuffer });
          const pdfData = await parser.getText();
          await parser.destroy().catch(() => {});
          
          // Check if we got meaningful text (not just page markers)
          const cleanText = (pdfData.text || '').replace(/\s+/g, ' ').replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
          if (cleanText.length >= 100) {
            textContent = pdfData.text;
            logger.info('PDF text extracted successfully', { 
              textLength: textContent.length,
              firstChars: textContent.substring(0, 100)
            });
          } else {
            logger.warn('PDF text extraction returned insufficient content, will send PDF directly to OpenAI', {
              extractedLength: cleanText.length,
              rawText: pdfData.text?.substring(0, 100)
            });
          }
        }
      } catch (pdfError) {
        logger.warn('PDF text extraction failed, will send PDF directly to OpenAI', {
          error: pdfError.message
        });
      }
    }
    
    // Handle image files (PNG, JPEG, etc.)
    const supportedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const isImage = input.file && supportedImageTypes.includes(input.file.mimeType);
    
    const promptText = `Extract the following resume details into the provided JSON schema. 
      CRITICAL INSTRUCTIONS:
      1. Extract ALL sections: Profile, Summary, Technical Skills, Experience, Education, Certifications, Projects, Languages, and References.
      2. If a section is missing, return an empty array [] or empty string "" - DO NOT omit the field.
      3. For 'technicalStrengths', list specific technical skills.
      4. For 'projects', associate them with a company if mentioned.
      5. Ensure no hallucination. Only use what is present in the source.`;
    
    const messages = [
      {
        role: "user",
        content: []
      }
    ];

    if (isPdf && !textContent) {
      // Send PDF directly to OpenAI as a file (for PDFs where text extraction failed/was insufficient)
      logger.info('Sending PDF directly to OpenAI as file', {
        mimeType: input.file.mimeType,
        dataLength: input.file.data?.length
      });
      
      let base64Data = input.file.data;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      
      messages[0].content.push({
        type: "file",
        file: {
          filename: "resume.pdf",
          file_data: `data:application/pdf;base64,${base64Data}`
        }
      });
      messages[0].content.push({
        type: "text",
        text: promptText
      });
      pdfSentDirectly = true;
    } else if (isImage) {
      logger.info('Sending image to OpenAI vision API', {
        mimeType: input.file.mimeType,
        dataLength: input.file.data?.length
      });
      
      let base64Data = input.file.data;
      if (!base64Data.startsWith('data:')) {
        base64Data = `data:${input.file.mimeType};base64,${base64Data}`;
      }
      
      messages[0].content.push({
        type: "text",
        text: promptText
      });
      messages[0].content.push({
        type: "image_url",
        image_url: {
          url: base64Data
        }
      });
    } else if (textContent) {
      logger.info('Sending text content to OpenAI', {
        textLength: textContent.length
      });
      messages[0].content.push({
        type: "text",
        text: promptText
      });
      messages[0].content.push({
        type: "text",
        text: textContent
      });
    } else {
      throw new Error('No valid input provided. Expected file (PDF or image) or text content.');
    }

    logger.info('Sending request to OpenAI API', {
      operationId,
      model: "gpt-4o",
      messageCount: messages.length,
      hasImage: isImage,
      hasPdfDirect: pdfSentDirectly,
      hasText: !!textContent,
      textLength: textContent?.length
    });
    
    const apiStartTime = Date.now();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "resume_extraction",
          schema: resumeSchema,
          strict: true
        }
      },
      temperature: 0.1,
    });
    
    const apiDuration = Date.now() - apiStartTime;
    logger.info('OpenAI API response received', {
      operationId,
      responseId: response.id,
      model: response.model,
      duration: `${apiDuration}ms`,
      usage: response.usage,
      finishReason: response.choices[0]?.finish_reason,
      hasContent: !!response.choices[0]?.message?.content
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.error("OpenAI returned empty content for extraction", {
        hasChoices: !!response.choices,
        choicesLength: response.choices?.length,
        firstChoice: response.choices?.[0],
        finishReason: response.choices?.[0]?.finish_reason,
        responseId: response.id
      });
      throw new Error("OpenAI API returned empty content. This may indicate an API error, invalid request, or content filtering.");
    }
    
    logger.info('Parsing OpenAI response content', {
      operationId,
      contentLength: content.length,
      contentPreview: content.substring(0, 200)
    });

    const data = JSON.parse(content);
    
    logger.debug('Processing extracted data', {
      operationId,
      hasProfile: !!data.profile,
      experienceCount: Array.isArray(data.experience) ? data.experience.length : 0,
      educationCount: Array.isArray(data.education) ? data.education.length : 0,
      certificationsCount: Array.isArray(data.certifications) ? data.certifications.length : 0,
      projectsCount: Array.isArray(data.projects) ? data.projects.length : 0,
      technicalStrengthsCount: Array.isArray(data.technicalStrengths) ? data.technicalStrengths.length : 0
    });
    
    data.experience = (Array.isArray(data.experience) ? data.experience : []).map((exp, i) => ({
      ...exp,
      id: exp.id || `exp-${Date.now()}-${i}`
    }));

    data.education = (Array.isArray(data.education) ? data.education : []).map((edu, i) => ({
      ...edu,
      id: edu.id || `edu-${Date.now()}-${i}`
    }));

    data.certifications = (Array.isArray(data.certifications) ? data.certifications : []).map((cert, i) => ({
      ...cert,
      id: cert.id || `cert-${Date.now()}-${i}`
    }));

    data.projects = (Array.isArray(data.projects) ? data.projects : []).map((proj, i) => ({
      ...proj,
      id: proj.id || `proj-${Date.now()}-${i}`
    }));

    data.technicalStrengths = Array.isArray(data.technicalStrengths) ? data.technicalStrengths : [];
    data.languages = Array.isArray(data.languages) ? data.languages : [];

    const totalDuration = Date.now() - startTime;
    logger.info('OpenAI extraction successful', {
      operationId,
      totalDuration: `${totalDuration}ms`,
      apiDuration: `${apiDuration}ms`,
      experienceCount: data.experience.length,
      educationCount: data.education.length
    });

    return data;
  } catch (error) {
    logger.error("OpenAI extraction error", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      stack: error.stack
    });
    throw error; // Throw instead of returning null to see the actual error
  }
}

export async function analyzeResume(data, jobDescription) {
  const operationId = `analyze-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  logger.info('OpenAI analyzeResume called', {
    operationId,
    hasData: !!data,
    hasJobDescription: !!jobDescription,
    jobDescriptionLength: jobDescription?.length,
    dataKeys: data ? Object.keys(data) : []
  });
  
  const client = getAI();
  try {
    logger.info('Sending analysis request to OpenAI API', {
      operationId,
      model: "gpt-4o"
    });
    
    const apiStartTime = Date.now();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Perform a concise ATS analysis of this resume based on the "ATS Evaluation Specification (v1.0)".
      
      RULES:
      1. Calculate score (0-100) using weights: Keyword Alignment (30%), Content Impact (25%), Formatting Compliance (20%), Experience Depth (15%), Language Quality (10%).
      2. Strictly follow the dimensions A, B, C, D, E and sub-scores (0-10).
      3. Apply Global Penalty Rules.
      4. Ensure output is valid JSON and within token limits.
      
      Resume JSON: ${JSON.stringify(data)}
      Target Job Description: ${jobDescription || "N/A"}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ats_analysis",
          schema: atsAnalysisSchema,
          strict: true
        }
      },
      temperature: 0.1,
    });
    
    const apiDuration = Date.now() - apiStartTime;
    logger.info('OpenAI API analysis response received', {
      operationId,
      responseId: response.id,
      model: response.model,
      duration: `${apiDuration}ms`,
      usage: response.usage,
      finishReason: response.choices[0]?.finish_reason
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.error('OpenAI returned empty content for analysis', {
        operationId,
        responseId: response.id
      });
      return null;
    }
    
    logger.debug('Parsing analysis response', {
      operationId,
      contentLength: content.length
    });
    
    const analysisResult = JSON.parse(content);
    const totalDuration = Date.now() - startTime;
    
    logger.info('OpenAI analysis successful', {
      operationId,
      totalDuration: `${totalDuration}ms`,
      finalScore: analysisResult.final_score,
      categoryScores: analysisResult.category_scores
    });
    
    return analysisResult;
  } catch (error) {
    logger.error("OpenAI analysis error", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      stack: error.stack
    });
    throw error; // Throw instead of returning null to see the actual error
  }
}

export async function improveResumeData(data, jobDescription) {
  const operationId = `improve-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  logger.info('OpenAI improveResumeData called', {
    operationId,
    hasData: !!data,
    hasJobDescription: !!jobDescription,
    jobDescriptionLength: jobDescription?.length,
    experienceCount: data?.experience?.length,
    educationCount: data?.education?.length
  });
  
  const client = getAI();
  try {
    logger.info('Sending improvement request to OpenAI API', {
      operationId,
      model: "gpt-4o"
    });
    
    const apiStartTime = Date.now();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Improve the text content of this resume while keeping the structure identical.
      Improvement Focus:
      - Strong action verbs
      - Quantification of results
      - ATS Keyword density
      - Professional tone
      
      Resume JSON: ${JSON.stringify(data)}
      Target Job Description: ${jobDescription || "N/A"}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "resume_improvement",
          schema: resumeSchema,
          strict: true
        }
      },
      temperature: 0.3,
    });

    const apiDuration = Date.now() - apiStartTime;
    logger.info('OpenAI API improvement response received', {
      operationId,
      responseId: response.id,
      model: response.model,
      duration: `${apiDuration}ms`,
      usage: response.usage,
      finishReason: response.choices[0]?.finish_reason
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.error('OpenAI returned empty content for improvement', {
        operationId,
        responseId: response.id
      });
      return null;
    }

    logger.debug('Parsing improvement response', {
      operationId,
      contentLength: content.length
    });

    const improved = JSON.parse(content);
    improved.experience = improved.experience.map((exp, i) => ({ ...exp, id: data.experience[i]?.id || `exp-i-${i}` }));
    improved.education = improved.education.map((edu, i) => ({ ...edu, id: data.education[i]?.id || `edu-i-${i}` }));
    improved.certifications = (improved.certifications || []).map((c, i) => ({ ...c, id: data.certifications[i]?.id || `cert-i-${i}` }));
    improved.projects = (improved.projects || []).map((p, i) => ({ ...p, id: data.projects[i]?.id || `proj-i-${i}` }));
    
    const totalDuration = Date.now() - startTime;
    logger.info('OpenAI improvement successful', {
      operationId,
      totalDuration: `${totalDuration}ms`,
      experienceCount: improved.experience.length,
      educationCount: improved.education.length
    });
    
    return improved;
  } catch (error) {
    logger.error("OpenAI improvement error", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      stack: error.stack
    });
    throw error; // Throw instead of returning null
  }
}

