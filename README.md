# Precision Resume Builder (AI-Powered)

Precision Resume Builder is a world-class, AI-driven application designed to transform raw career data into pixel-perfect, ATS-optimized professional resumes. Leveraging the power of Google's Gemini 3 Flash models, the application provides intelligent data extraction, real-time content improvement, and multi-format exports (PDF, DOCX, Markdown) based on a high-conversion professional template.

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
- **AI**: Google Gemini API (@google/genai)
- **Parsing**: Mammoth.js (DOCX to Text)
- **Generation**: 
    - html2pdf.js (DOM to PDF)
    - docx (JS to Word Document)
- **Fonts**: Playfair Display & Libre Baskerville (Google Fonts)

## 💻 Local Setup Guide

### Prerequisites

- A modern web browser (Chrome, Edge, or Safari).
- A **Google Gemini API Key**. You can obtain one from the [Google AI Studio](https://aistudio.google.com/).

### Installation

1.  **Clone the project**:
    ```bash
    git clone <your-repository-url>
    cd precision-resume-builder
    ```

2.  **Configure Environment Variables**:
    The application expects the Gemini API key to be available via `process.env.API_KEY`. 
    - If running in a local development environment (like Vite or Webpack), create a `.env` file:
      ```env
      API_KEY=your_gemini_api_key_here
      ```

3.  **Run the application**:
    Since this project uses ESM modules and an `importmap` in `index.html`, you can serve it using any local static file server:
    ```bash
    # Using npx (Node.js)
    npx serve .
    
    # Or using Python
    python -m http.server 8000
    ```

4.  **Access the App**:
    Open `http://localhost:8000` in your browser.

## 📝 Usage Notes

- **API Key**: The app requires a valid API key to perform AI extractions and improvements. Ensure your key has access to the `gemini-3-flash-preview` model.
- **Printing**: For the best PDF results, use the "Generate PDF" button within the app. If using the browser's native print (Ctrl+P), ensure "Background Graphics" is enabled and margins are set to "None".
- **File Support**: The importer supports `.pdf`, `.docx`, and `.txt` files. For PDFs, the AI performs visual extraction; for DOCX, it parses the raw text structure.

---
