
export interface ResumeProfile {
  fullName: string;
  phone: string;
  email: string;
  location: string;
  links?: string;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  location: string;
  period: string;
  bullets: string[];
}

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  period: string;
  details: string;
}

export interface ResumeData {
  profile: ResumeProfile;
  summary: string;
  technicalStrengths: string[];
  experience: Experience[];
  education: Education[];
  languages: string[];
  references: string;
}

export interface ATSAnalysisResult {
  final_score: number;
  category_scores: {
    keyword_alignment: number;
    content_impact: number;
    formatting_compliance: number;
    experience_depth: number;
    language_quality: number;
  };
  sub_scores: {
    A1_required_skill_match: number;
    A2_secondary_skill_coverage: number;
    A3_keyword_naturalness: number;
    A4_role_title_alignment: number;
    B1_action_verbs: number;
    B2_quantification: number;
    B3_outcome_orientation: number;
    B4_relevance_filtering: number;
    C1_standard_headings: number;
    C2_ats_safe_structure: number;
    C3_date_consistency: number;
    C4_bullet_clarity: number;
    D1_skill_in_context: number;
    D2_leadership_signals: number;
    D3_career_progression: number;
    E1_grammar: number;
    E2_tense_consistency: number;
    E3_conciseness: number;
  };
  deductions_applied: {
    reason: string;
    points: number;
  }[];
  improvement_recommendations: string[];
  keyword_gap_list?: string[];
  missing_required_skills?: string[];
}

export const initialResumeData: ResumeData = {
  profile: {
    fullName: "Danish Habib",
    phone: "+923215293580",
    email: "danishhabib111@gmail.com",
    location: "Islamabad, Pakistan",
  },
  summary: "Motivated and adaptable professional with experience across hospitality, healthcare, and customer service sectors. Skilled in handling financial processes such as payment transactions, reporting, and maintaining accurate records. Strong interpersonal, training, and communication skills with a proven ability to work under pressure. Detail-oriented and committed to delivering high standards in both individual and team settings. Eager to contribute to dynamic environments where reliability and service excellence are valued.",
  technicalStrengths: [
    "Financial Reporting & Analysis",
    "Microsoft Office Proficiency",
    "Customer Service Excellence",
    "Cash Handling Accuracy",
    "Data Documentation",
    "Staff Onboarding & Training",
    "Food Hygiene Compliance",
    "Record Keeping",
    "POS System Handling",
    "Risk Assessment",
    "Basic First Aid Knowledge",
    "Health & Safety Protocols",
    "Team Leadership",
    "Clear Communication"
  ],
  experience: [
    {
      id: "1",
      company: "McDonald's",
      title: "Crew Member",
      location: "United Kingdom",
      period: "2023 - Present",
      bullets: [
        "Provided quick, friendly service ensuring customer satisfaction and maintaining brand reputation consistently.",
        "Handled payments, issued receipts, and balanced tills with a focus on transaction accuracy.",
        "Prepared food following safety protocols and hygiene standards while meeting time-sensitive demands.",
        "Supported team in maintaining cleanliness, restocking supplies, and adhering to quality control.",
        "Communicated effectively during peak hours to ensure efficient workflow and reduced wait times."
      ]
    },
    {
      id: "2",
      company: "Nando's",
      title: "Buddy Trainer",
      location: "United Kingdom",
      period: "2022 - 2023",
      bullets: [
        "Delivered engaging training to new staff, ensuring full understanding of service expectations.",
        "Guided team members on menu knowledge, order handling, and food safety compliance.",
        "Motivated peers through mentorship, boosting morale and fostering a productive environment.",
        "Collaborated with management to assign tasks and improve front-of-house operations.",
        "Ensured the restaurant maintained a welcoming atmosphere and consistent customer experience."
      ]
    }
  ],
  education: [
    {
      id: "e1",
      institution: "De Montfort University",
      qualification: "Bachelor's Degree in Economics and Finance (2:2)",
      period: "2021",
      details: ""
    }
  ],
  languages: ["English (Fluent)", "Shona (Fluent)"],
  references: "Will be available upon request"
};
