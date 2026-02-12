import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || "" });

const resumeSchema = {
  type: Type.OBJECT,
  properties: {
    profile: {
      type: Type.OBJECT,
      properties: {
        fullName: { type: Type.STRING },
        phone: { type: Type.STRING },
        email: { type: Type.STRING },
        location: { type: Type.STRING },
        website: { type: Type.STRING },
        linkedin: { type: Type.STRING },
      },
      required: ["fullName", "phone", "email", "location"],
    },
    summary: { type: Type.STRING },
    technicalStrengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          title: { type: Type.STRING },
          location: { type: Type.STRING },
          period: { type: Type.STRING },
          bullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["company", "title", "location", "period", "bullets"],
      },
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          qualification: { type: Type.STRING },
          period: { type: Type.STRING },
          details: { type: Type.STRING },
        },
        required: ["institution", "qualification", "period"],
      },
    },
    certifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          issuer: { type: Type.STRING },
          date: { type: Type.STRING },
        }
      }
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          associatedWith: { type: Type.STRING },
          technologies: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
        }
      }
    },
    languages: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    references: { type: Type.STRING },
  },
  required: ["profile", "summary", "technicalStrengths", "experience", "education", "languages", "references"],
};

const atsAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    final_score: { type: Type.NUMBER },
    category_scores: {
      type: Type.OBJECT,
      properties: {
        keyword_alignment: { type: Type.NUMBER },
        content_impact: { type: Type.NUMBER },
        formatting_compliance: { type: Type.NUMBER },
        experience_depth: { type: Type.NUMBER },
        language_quality: { type: Type.NUMBER },
      },
      required: ["keyword_alignment", "content_impact", "formatting_compliance", "experience_depth", "language_quality"]
    },
    sub_scores: {
      type: Type.OBJECT,
      properties: {
        A1_required_skill_match: { type: Type.NUMBER },
        A2_secondary_skill_coverage: { type: Type.NUMBER },
        A3_keyword_naturalness: { type: Type.NUMBER },
        A4_role_title_alignment: { type: Type.NUMBER },
        B1_action_verbs: { type: Type.NUMBER },
        B2_quantification: { type: Type.NUMBER },
        B3_outcome_orientation: { type: Type.NUMBER },
        B4_relevance_filtering: { type: Type.NUMBER },
        C1_standard_headings: { type: Type.NUMBER },
        C2_ats_safe_structure: { type: Type.NUMBER },
        C3_date_consistency: { type: Type.NUMBER },
        C4_bullet_clarity: { type: Type.NUMBER },
        D1_skill_in_context: { type: Type.NUMBER },
        D2_leadership_signals: { type: Type.NUMBER },
        D3_career_progression: { type: Type.NUMBER },
        E1_grammar: { type: Type.NUMBER },
        E2_tense_consistency: { type: Type.NUMBER },
        E3_conciseness: { type: Type.NUMBER },
      }
    },
    deductions_applied: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          reason: { type: Type.STRING },
          points: { type: Type.NUMBER },
        }
      }
    },
    improvement_recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    keyword_gap_list: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    missing_required_skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["final_score", "category_scores", "sub_scores", "deductions_applied", "improvement_recommendations"]
};

export async function extractResumeData(input) {
  const ai = getAI();
  try {
    const parts = [
      { text: `Extract the following resume details into the provided JSON schema. 
      CRITICAL INSTRUCTIONS:
      1. Extract ALL sections: Profile, Summary, Technical Skills, Experience, Education, Certifications, Projects, Languages, and References.
      2. If a section is missing, return an empty array [] or empty string "" - DO NOT omit the field.
      3. For 'technicalStrengths', list specific technical skills.
      4. For 'projects', associate them with a company if mentioned.
      5. Ensure no hallucination. Only use what is present in the source.` }
    ];

    if (input.file) {
      parts.push({
        inlineData: {
          data: input.file.data,
          mimeType: input.file.mimeType
        }
      });
    } else if (input.text) {
      parts.push({ text: input.text });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeSchema,
      },
    });

    const data = JSON.parse(response.text);
    
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

    return data;
  } catch (error) {
    console.error("Extraction error:", error);
    return null;
  }
}

export async function analyzeResume(data, jobDescription) {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a concise ATS analysis of this resume based on the "ATS Evaluation Specification (v1.0)".
      
      RULES:
      1. Calculate score (0-100) using weights: Keyword Alignment (30%), Content Impact (25%), Formatting Compliance (20%), Experience Depth (15%), Language Quality (10%).
      2. Strictly follow the dimensions A, B, C, D, E and sub-scores (0-10).
      3. Apply Global Penalty Rules.
      4. Ensure output is valid JSON and within token limits.
      
      Resume JSON: ${JSON.stringify(data)}
      Target Job Description: ${jobDescription || "N/A"}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: atsAnalysisSchema,
      },
    });
    
    if (!response.text) return null;
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Analysis error:", error);
    return null;
  }
}

export async function improveResumeData(data, jobDescription) {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Improve the text content of this resume while keeping the structure identical.
      Improvement Focus:
      - Strong action verbs
      - Quantification of results
      - ATS Keyword density
      - Professional tone
      
      Resume JSON: ${JSON.stringify(data)}
      Target Job Description: ${jobDescription || "N/A"}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeSchema,
      },
    });

    const improved = JSON.parse(response.text);
    improved.experience = improved.experience.map((exp, i) => ({ ...exp, id: data.experience[i]?.id || `exp-i-${i}` }));
    improved.education = improved.education.map((edu, i) => ({ ...edu, id: data.education[i]?.id || `edu-i-${i}` }));
    improved.certifications = (improved.certifications || []).map((c, i) => ({ ...c, id: data.certifications[i]?.id || `cert-i-${i}` }));
    improved.projects = (improved.projects || []).map((p, i) => ({ ...p, id: data.projects[i]?.id || `proj-i-${i}` }));
    
    return improved;
  } catch (error) {
    console.error("Improvement error:", error);
    return null;
  }
}

