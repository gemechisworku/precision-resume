import OpenAI from "openai";

const getAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
};

// JSON Schema for resume extraction
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
      required: ["fullName", "phone", "email", "location"],
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
        required: ["institution", "qualification", "period"],
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
        }
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
        }
      }
    },
    languages: {
      type: "array",
      items: { type: "string" },
    },
    references: { type: "string" },
  },
  required: ["profile", "summary", "technicalStrengths", "experience", "education", "languages", "references"],
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
      required: ["keyword_alignment", "content_impact", "formatting_compliance", "experience_depth", "language_quality"]
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
      }
    },
    deductions_applied: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reason: { type: "string" },
          points: { type: "number" },
        }
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
  required: ["final_score", "category_scores", "sub_scores", "deductions_applied", "improvement_recommendations"]
};

export async function extractResumeData(input) {
  const client = getAI();
  try {
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract the following resume details into the provided JSON schema. 
      CRITICAL INSTRUCTIONS:
      1. Extract ALL sections: Profile, Summary, Technical Skills, Experience, Education, Certifications, Projects, Languages, and References.
      2. If a section is missing, return an empty array [] or empty string "" - DO NOT omit the field.
      3. For 'technicalStrengths', list specific technical skills.
      4. For 'projects', associate them with a company if mentioned.
      5. Ensure no hallucination. Only use what is present in the source.`
          }
        ]
      }
    ];

    if (input.file) {
      messages[0].content.push({
        type: "image_url",
        image_url: {
          url: `data:${input.file.mimeType};base64,${input.file.data}`
        }
      });
    } else if (input.text) {
      messages[0].content.push({
        type: "text",
        text: input.text
      });
    }

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

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const data = JSON.parse(content);
    
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
    console.error("OpenAI extraction error:", error);
    return null;
  }
}

export async function analyzeResume(data, jobDescription) {
  const client = getAI();
  try {
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
    
    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    
    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });
    throw error; // Throw instead of returning null to see the actual error
  }
}

export async function improveResumeData(data, jobDescription) {
  const client = getAI();
  try {
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

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const improved = JSON.parse(content);
    improved.experience = improved.experience.map((exp, i) => ({ ...exp, id: data.experience[i]?.id || `exp-i-${i}` }));
    improved.education = improved.education.map((edu, i) => ({ ...edu, id: data.education[i]?.id || `edu-i-${i}` }));
    improved.certifications = (improved.certifications || []).map((c, i) => ({ ...c, id: data.certifications[i]?.id || `cert-i-${i}` }));
    improved.projects = (improved.projects || []).map((p, i) => ({ ...p, id: data.projects[i]?.id || `proj-i-${i}` }));
    
    return improved;
  } catch (error) {
    console.error("OpenAI improvement error:", error);
    return null;
  }
}

