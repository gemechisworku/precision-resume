# Precision Resume Builder (AI-Powered)

Precision Resume Builder is a world-class, AI-driven application designed to transform raw career data into pixel-perfect, ATS-optimized professional resumes. Leveraging the power of OpenAI GPT-4o or Google's Gemini 3 Flash models, the application provides intelligent data extraction, real-time content improvement, and multi-format exports (PDF, DOCX, Markdown) based on a high-conversion professional template.

## 🚀 Features

- **AI Resume Extraction**: Upload an existing PDF, DOCX, or Text resume. The AI parses the unstructured data into a structured schema automatically.
- **ATS Analysis Engine**: Evaluates your resume against a target job description, providing a score (0-100) based on keyword alignment, content impact, and formatting compliance.
- **AI-Powered Improvements**: Rewrites summaries and bullet points using strong action verbs and quantified achievements to maximize ATS readability.
- **Side-by-Side Review**: Compare original content with AI suggestions in a dedicated "Review Workspace" before applying changes.
- **Multi-Format Export**:
    - **PDF**: Pixel-perfect generation using a strict typographic template.
    - **DOCX**: Structured Word document export for easy manual editing.
    - **Markdown**: Lightweight version for developer portfolios or GitHub.
- **Modern UI/UX**: Built with a sleek "Dark Mode" editor and a "Clean Paper" preview, optimized for desktop and tablet usage.

## 📁 Directory Structure

```text
.
├── components/
│   └── ResumePreview.tsx     # The "Pixel-Perfect" React template for the resume
├── services/
│   ├── aiService.ts          # AI service router (routes to OpenAI or Gemini)
│   ├── openaiService.ts      # OpenAI API integration (Extraction, Analysis, Improvement)
│   └── geminiService.ts      # Google Gemini API integration (Extraction, Analysis, Improvement)
├── utils/
│   └── exportUtils.ts        # Business logic for DOCX and Markdown generation
├── App.tsx                   # Main application logic, state management, and form UI
├── types.ts                  # TypeScript interfaces and initial mock data
├── index.tsx                 # Application entry point
├── index.html                # Main HTML5 wrapper with Tailwind and Fonts
├── metadata.json             # Project metadata and permissions
└── README.md                 # Project documentation
```

## 🛠️ Technology Stack

- **Frontend**: React (ES6+ Modules)
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4o (priority) or Google Gemini 3 Flash (@google/genai)
- **Parsing**: Mammoth.js (DOCX to Text)
- **Generation**: 
    - html2pdf.js (DOM to PDF)
    - docx (JS to Word Document)
- **Fonts**: Playfair Display & Libre Baskerville (Google Fonts)

## 💻 Local Setup Guide

### Prerequisites

- A modern web browser (Chrome, Edge, or Safari).
- An **OpenAI API Key** (recommended) or a **Google Gemini API Key**. 
  - Get OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
  - Get Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1.  **Clone the project**:
    ```bash
    git clone <your-repository-url>
    cd precision-resume-builder
    ```

2.  **Configure Environment Variables**:
    The application uses a **backend proxy** to securely handle API keys. Create a `.env` file in the project root:
      ```env
      # OpenAI API Key (Priority - used if provided)
      OPENAI_API_KEY=your_openai_api_key_here
      
      # Gemini API Key (Fallback - used if OpenAI key is not provided)
      GEMINI_API_KEY=your_gemini_api_key_here
      # Note: For backward compatibility, API_KEY is also supported for Gemini
      
      # Backend server port (optional, defaults to 3001)
      PORT=3001
      ```
    
    **Priority Order:**
    1. If `OPENAI_API_KEY` is set → Uses OpenAI GPT-4o
    2. If only `GEMINI_API_KEY` (or `API_KEY`) is set → Uses Google Gemini 3 Flash
    3. If neither is set → Application will throw an error

3.  **Run the application**:
    The application consists of a frontend (Vite) and backend (Express) server. You can run them together or separately:
    
    **Option A: Run both together (recommended for development)**
    ```bash
    npm run dev:all
    ```
    This starts both the backend (port 3001) and frontend (port 3000) servers.
    
    **Option B: Run separately**
    ```bash
    # Terminal 1: Start backend server
    npm run dev:backend
    
    # Terminal 2: Start frontend server
    npm run dev
    ```

4.  **Access the App**:
    - Frontend: Open `http://localhost:3000` in your browser
    - Backend API: Available at `http://localhost:3001/api/ai/*`

## 📝 Usage Notes

- **API Keys**: The app requires at least one valid API key (OpenAI or Gemini) to perform AI extractions and improvements. OpenAI is used by default if both keys are provided. If OpenAI fails, the app will automatically fall back to Gemini (if configured).
  - **✅ Secure**: API keys are stored on the backend server and never exposed to the browser. All AI requests are proxied through the backend API.
- **Models Used**:
  - OpenAI: `gpt-4o` (with structured outputs/JSON mode)
  - Gemini: `gemini-3-flash-preview`
- **Printing**: For the best PDF results, use the "Generate PDF" button within the app. If using the browser's native print (Ctrl+P), ensure "Background Graphics" is enabled and margins are set to "None".
- **File Support**: The importer supports `.pdf`, `.docx`, and `.txt` files. For PDFs, the AI performs visual extraction; for DOCX, it parses the raw text structure.

---
