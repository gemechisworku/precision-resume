
import React, { useState, useRef } from 'react';
import { ResumeData, initialResumeData, Experience, Education, Certification, Project, ATSAnalysisResult } from './types';
import ResumePreview from './components/ResumePreview';
import { extractResumeData, improveResumeData, analyzeResume } from './services/aiService';
import { downloadMarkdown, downloadDocx } from './utils/exportUtils';
import mammoth from 'mammoth';

// Global declaration for html2pdf
declare global {
  interface Window {
    html2pdf: any;
  }
}

type ViewMode = 'editor' | 'review';

const App: React.FC = () => {
  const [data, setData] = useState<ResumeData>(initialResumeData);
  const [pendingData, setPendingData] = useState<ResumeData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<ATSAnalysisResult | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Change Handlers ---
  const handleProfileChange = (field: keyof typeof data.profile, value: string) => {
    setData(prev => ({ ...prev, profile: { ...prev.profile, [field]: value } }));
  };
  const handleSummaryChange = (val: string) => setData(prev => ({ ...prev, summary: val }));
  
  // Technical Skills Multi-Select
  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!data.technicalStrengths.includes(skillInput.trim())) {
        setData(prev => ({ ...prev, technicalStrengths: [...prev.technicalStrengths, skillInput.trim()] }));
      }
      setSkillInput("");
    }
  };
  const removeSkill = (skill: string) => {
    setData(prev => ({ ...prev, technicalStrengths: prev.technicalStrengths.filter(s => s !== skill) }));
  };

  const handleUpdateExperience = (id: string, field: keyof Experience, value: any) => {
    setData(prev => ({ ...prev, experience: prev.experience.map(e => e.id === id ? { ...e, [field]: value } : e) }));
  };
  const addExperience = () => {
    const newExp: Experience = { id: `exp-${Date.now()}`, company: "", title: "", location: "", period: "", bullets: [""] };
    setData(prev => ({ ...prev, experience: [newExp, ...prev.experience] }));
  };
  const removeExperience = (id: string) => {
    setData(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== id) }));
  };

  const handleUpdateEducation = (id: string, field: keyof Education, value: any) => {
    setData(prev => ({ ...prev, education: prev.education.map(e => e.id === id ? { ...e, [field]: value } : e) }));
  };
  const addEducation = () => {
    const newEdu: Education = { id: `edu-${Date.now()}`, institution: "", qualification: "", period: "", details: "" };
    setData(prev => ({ ...prev, education: [newEdu, ...prev.education] }));
  };
  const removeEducation = (id: string) => {
    setData(prev => ({ ...prev, education: prev.education.filter(e => e.id !== id) }));
  };

  const handleUpdateCertification = (id: string, field: keyof Certification, value: string) => {
    setData(prev => ({ ...prev, certifications: prev.certifications.map(c => c.id === id ? { ...c, [field]: value } : c) }));
  };
  const addCertification = () => {
    const newCert: Certification = { id: `cert-${Date.now()}`, name: "", issuer: "", date: "" };
    setData(prev => ({ ...prev, certifications: [...(prev.certifications || []), newCert] }));
  };
  const removeCertification = (id: string) => {
    setData(prev => ({ ...prev, certifications: prev.certifications.filter(c => c.id !== id) }));
  };

  const handleUpdateProject = (id: string, field: keyof Project, value: any) => {
    setData(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p) }));
  };
  const addProject = () => {
    const newProj: Project = { id: `proj-${Date.now()}`, title: "", description: "", associatedWith: "", technologies: [] };
    setData(prev => ({ ...prev, projects: [...(prev.projects || []), newProj] }));
  };
  const removeProject = (id: string) => {
    setData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const handleLanguagesChange = (val: string) => {
    setData(prev => ({ ...prev, languages: val.split(',').map(s => s.trim()).filter(s => s !== "") }));
  };
  const handleReferencesChange = (val: string) => {
    setData(prev => ({ ...prev, references: val }));
  };

  // --- AI Logic ---
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setProcessingStatus(`Analyzing ${file.name}...`);
    try {
      let extracted: ResumeData | null = null;
      if (file.type === 'application/pdf') {
        const base64 = await blobToBase64(file);
        extracted = await extractResumeData({ file: { data: base64, mimeType: 'application/pdf' } });
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const { value: text } = await mammoth.extractRawText({ arrayBuffer });
        extracted = await extractResumeData({ text });
      } else {
        const text = await file.text();
        extracted = await extractResumeData({ text });
      }
      if (extracted) {
        setData(extracted);
        setProcessingStatus("Import Successful!");
        setTimeout(() => setProcessingStatus(""), 2000);
      }
    } catch (err) { 
      console.error(err);
      alert("Error reading file."); 
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    setIsProcessing(true);
    setProcessingStatus("Evaluating ATS compatibility...");
    try {
      const targetData = pendingData || data;
      const result = await analyzeResume(targetData, jobDescription);
      if (result) {
        setAiAnalysis(result);
        setViewMode('review');
      } else {
        alert("Could not complete analysis.");
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleImprove = async () => {
    setIsProcessing(true);
    setProcessingStatus("Optimizing phrasing & keywords...");
    try {
      const improved = await improveResumeData(data, jobDescription);
      if (improved) {
        setPendingData(improved);
        setViewMode('review');
      } else {
        alert("Optimization failed.");
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const applyImprovements = () => {
    if (pendingData) {
      setData(pendingData);
      setPendingData(null);
    }
    setViewMode('editor');
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const generatePDF = async () => {
    try {
      const element = document.getElementById('resume-preview');
      if (!element) {
        alert('Resume preview not found. Please make sure a resume is loaded.');
        return;
      }
      
      if (typeof window.html2pdf !== 'function') {
        alert('PDF generator is still loading. Please wait a moment and try again.');
        console.error('html2pdf is not loaded. Check if the CDN script loaded correctly.');
        return;
      }

      setIsGeneratingPDF(true);
      
      const name = data.profile.fullName?.trim() ? data.profile.fullName.replace(/\s+/g, '_') : 'Resume';
      const opt = {
        margin: 0,
        filename: `${name}_Resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          backgroundColor: '#ffffff',
          logging: false,
          // Convert oklch() colors to computed rgb() before html2canvas renders.
          // Tailwind CSS v4 uses oklch() which html2canvas doesn't support.
          onclone: (clonedDoc: Document) => {
            const clonedElement = clonedDoc.getElementById('resume-preview');
            if (!clonedElement) return;
            
            // Get all elements from both original and clone
            const originalElements = [element, ...Array.from(element.querySelectorAll('*'))];
            const clonedElements = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))];
            
            // Map original to clone by index (they should be in same order)
            for (let i = 0; i < originalElements.length && i < clonedElements.length; i++) {
              const origEl = originalElements[i] as HTMLElement;
              const cloneEl = clonedElements[i] as HTMLElement;
              
              // Get computed styles from ORIGINAL element (browser has already resolved oklch to rgb)
              const computed = window.getComputedStyle(origEl);
              
              // Copy ALL computed CSS properties as inline styles with !important
              // This ensures html2canvas only sees RGB values from computed styles, never oklch() from stylesheets
              const style = computed as any;
              for (let j = 0; j < style.length; j++) {
                const prop = style[j];
                const value = computed.getPropertyValue(prop);
                
                // Skip properties that might contain oklch or are not needed
                if (value && value.trim() && 
                    value !== 'none' && 
                    value !== 'normal' &&
                    !value.includes('oklch') &&
                    !prop.startsWith('--')) { // Skip CSS custom properties
                  try {
                    cloneEl.style.setProperty(prop, value, 'important');
                  } catch (e) {
                    // Some properties might not be settable, skip them
                  }
                }
              }
            }
            
            // Remove all stylesheets AFTER applying inline styles to prevent html2canvas
            // from reading oklch() colors from Tailwind CSS v4 stylesheets
            try {
              const stylesheets = Array.from(clonedDoc.styleSheets);
              for (const sheet of stylesheets) {
                if (sheet.ownerNode) {
                  sheet.ownerNode.parentNode?.removeChild(sheet.ownerNode);
                }
              }
              
              // Remove all <link> and <style> tags that might contain oklch
              const links = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"], style'));
              links.forEach(link => link.remove());
            } catch (e) {
              // Some stylesheets can't be removed (cross-origin), that's okay
              // The inline styles with !important should override them anyway
            }
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await window.html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const ScoreBar = ({ label, score, weight }: { label: string, score: number | undefined, weight?: string }) => {
    const safeScore = typeof score === 'number' ? score : 0;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="text-slate-400">{label} {weight && <span className="text-slate-600">({weight})</span>}</span>
          <span className={safeScore >= 8 ? "text-green-400" : safeScore >= 5 ? "text-yellow-400" : "text-red-400"}>
            {safeScore.toFixed(1)}/10
          </span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${safeScore >= 8 ? "bg-green-500" : safeScore >= 5 ? "bg-yellow-500" : "bg-red-500"}`} 
            style={{ width: `${safeScore * 10}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden font-sans">
      {/* LEFT SIDEBAR */}
      <div className={`w-full md:w-5/12 lg:w-4/12 bg-[#020617] text-slate-200 flex flex-col no-print border-r border-slate-800 transition-all ${viewMode === 'review' ? 'hidden md:flex' : ''}`}>
        <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#020617] z-10 shrink-0">
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter">PRECISION <span className="text-blue-500">RESUME</span></h1>
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.3em]">Single Locked Template</p>
          </div>
          {viewMode === 'editor' && (
            <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="text-[10px] px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 font-bold border border-slate-700">IMPORT</button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md,.docx,.pdf" />
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide pb-24">
          {processingStatus && (
            <div className="sticky top-0 z-20 mb-6 p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg flex items-center gap-3 backdrop-blur-md">
              <div className="animate-spin h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              <span className="text-[11px] text-blue-300 font-bold uppercase">{processingStatus}</span>
            </div>
          )}

          {viewMode === 'editor' ? (
            <>
              {/* Section 1: Contact */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-[2px] w-8 bg-blue-500 rounded-full"></div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">1. Contact Information</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <input className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={data.profile.fullName} onChange={e => handleProfileChange('fullName', e.target.value)} placeholder="Full Name" />
                  <div className="grid grid-cols-2 gap-4">
                    <input className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={data.profile.phone} onChange={e => handleProfileChange('phone', e.target.value)} placeholder="Phone" />
                    <input className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={data.profile.email} onChange={e => handleProfileChange('email', e.target.value)} placeholder="Email" />
                  </div>
                  <input className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={data.profile.location} onChange={e => handleProfileChange('location', e.target.value)} placeholder="Location" />
                  <div className="grid grid-cols-2 gap-4">
                    <input className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={data.profile.website || ''} onChange={e => handleProfileChange('website', e.target.value)} placeholder="My Website / Portfolio" />
                    <input className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={data.profile.linkedin || ''} onChange={e => handleProfileChange('linkedin', e.target.value)} placeholder="LinkedIn URL" />
                  </div>
                </div>
              </section>

              {/* Section 2: Summary */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-[2px] w-8 bg-blue-500 rounded-full"></div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">2. Professional Summary</h3>
                </div>
                <textarea className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none h-32 leading-relaxed resize-none" value={data.summary} onChange={e => handleSummaryChange(e.target.value)} />
              </section>

              {/* Section 3: Technical Skills */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-[2px] w-8 bg-blue-500 rounded-full"></div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">3. Technical Skills</h3>
                </div>
                <div className="space-y-3">
                  <input 
                    className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                    placeholder="Type skill and press Enter..." 
                    value={skillInput} 
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={addSkill}
                  />
                  <div className="flex flex-wrap gap-2">
                    {data.technicalStrengths.map(skill => (
                      <span key={skill} className="bg-blue-600/20 text-blue-300 text-[10px] px-2 py-1 rounded flex items-center gap-2 border border-blue-500/30">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {/* Section 4: Experience */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-[2px] w-8 bg-blue-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">4. Experience</h3>
                  </div>
                  <button onClick={addExperience} className="text-[9px] px-3 py-1 bg-blue-600/10 text-blue-400 rounded-full border border-blue-500/20 font-bold hover:bg-blue-600/20 transition-all">+ ADD</button>
                </div>
                <div className="space-y-6">
                  {data.experience.map(exp => (
                    <div key={exp.id} className="p-4 bg-slate-900/40 rounded-xl relative group border border-slate-800">
                      <button onClick={() => removeExperience(exp.id)} className="absolute -top-2 -right-2 bg-red-600 text-white h-6 w-6 rounded-full text-[10px] hidden group-hover:flex items-center justify-center font-black">×</button>
                      <div className="space-y-3">
                        <input className="w-full bg-transparent font-black text-sm outline-none border-b border-slate-800 focus:border-blue-500 py-1" value={exp.company} onChange={e => handleUpdateExperience(exp.id, 'company', e.target.value)} placeholder="Company" />
                        <input className="w-full bg-transparent italic text-xs outline-none text-slate-400 border-b border-slate-800 focus:border-blue-500 py-1" value={exp.title} onChange={e => handleUpdateExperience(exp.id, 'title', e.target.value)} placeholder="Job Title" />
                        <div className="grid grid-cols-2 gap-3">
                          <input className="bg-slate-950 px-2 py-1.5 rounded text-[10px] border border-slate-800 outline-none" value={exp.location} onChange={e => handleUpdateExperience(exp.id, 'location', e.target.value)} placeholder="Location" />
                          <input className="bg-slate-950 px-2 py-1.5 rounded text-[10px] border border-slate-800 outline-none" value={exp.period} onChange={e => handleUpdateExperience(exp.id, 'period', e.target.value)} placeholder="Period" />
                        </div>
                        <textarea className="w-full bg-slate-950 p-3 text-[11px] rounded h-24 outline-none font-sans border border-slate-800 focus:border-blue-500 resize-none" value={exp.bullets.join('\n')} onChange={e => handleUpdateExperience(exp.id, 'bullets', e.target.value.split('\n'))} placeholder="Bullets..." />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 5: Projects */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-[2px] w-8 bg-blue-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">5. Projects</h3>
                  </div>
                  <button onClick={addProject} className="text-[9px] px-3 py-1 bg-blue-600/10 text-blue-400 rounded-full border border-blue-500/20 font-bold hover:bg-blue-600/20 transition-all">+ ADD</button>
                </div>
                <div className="space-y-6">
                  {(data.projects || []).map(proj => (
                    <div key={proj.id} className="p-4 bg-slate-900/40 rounded-xl relative group border border-slate-800">
                      <button onClick={() => removeProject(proj.id)} className="absolute -top-2 -right-2 bg-red-600 text-white h-6 w-6 rounded-full text-[10px] hidden group-hover:flex items-center justify-center font-black">×</button>
                      <div className="space-y-3">
                        <input className="w-full bg-transparent font-black text-sm outline-none border-b border-slate-800 focus:border-blue-500 py-1" value={proj.title} onChange={e => handleUpdateProject(proj.id, 'title', e.target.value)} placeholder="Project Title" />
                        <div className="grid grid-cols-2 gap-3">
                          <select 
                            className="bg-slate-950 px-2 py-1.5 rounded text-[10px] border border-slate-800 outline-none text-slate-300" 
                            value={proj.associatedWith} 
                            onChange={e => handleUpdateProject(proj.id, 'associatedWith', e.target.value)}
                          >
                            <option value="">No Association</option>
                            {data.experience.map(exp => <option key={exp.id} value={exp.company}>{exp.company}</option>)}
                          </select>
                          <input className="bg-slate-950 px-2 py-1.5 rounded text-[10px] border border-slate-800 outline-none" value={proj.technologies.join(', ')} onChange={e => handleUpdateProject(proj.id, 'technologies', e.target.value.split(',').map(s => s.trim()))} placeholder="Technologies (comma separated)" />
                        </div>
                        <textarea className="w-full bg-slate-950 p-2 text-[11px] rounded h-20 outline-none border border-slate-800 focus:border-blue-500" value={proj.description} onChange={e => handleUpdateProject(proj.id, 'description', e.target.value)} placeholder="Brief description..." />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 6: Education & Certs */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-[2px] w-8 bg-blue-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">6. Education & Certs</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addEducation} className="text-[9px] px-3 py-1 bg-blue-600/10 text-blue-400 rounded-full border border-blue-500/20 font-bold hover:bg-blue-600/20 transition-all">+ EDU</button>
                    <button onClick={addCertification} className="text-[9px] px-3 py-1 bg-green-600/10 text-green-400 rounded-full border border-green-500/20 font-bold hover:bg-green-600/20 transition-all">+ CERT</button>
                  </div>
                </div>
                
                {/* Education List */}
                <div className="space-y-4 mb-6">
                  {data.education.map(edu => (
                    <div key={edu.id} className="p-4 bg-slate-900/40 rounded-xl relative group border border-slate-800">
                      <button onClick={() => removeEducation(edu.id)} className="absolute -top-2 -right-2 bg-red-600 text-white h-6 w-6 rounded-full text-[10px] hidden group-hover:flex items-center justify-center font-black">×</button>
                      <div className="space-y-2">
                        <input className="w-full bg-transparent font-black text-sm outline-none border-b border-slate-800 focus:border-blue-500 py-1" value={edu.institution} onChange={e => handleUpdateEducation(edu.id, 'institution', e.target.value)} placeholder="Institution" />
                        <div className="grid grid-cols-2 gap-3">
                          <input className="w-full bg-transparent italic text-xs outline-none text-slate-400 border-b border-slate-800 focus:border-blue-500 py-1" value={edu.qualification} onChange={e => handleUpdateEducation(edu.id, 'qualification', e.target.value)} placeholder="Degree" />
                          <input className="bg-slate-950 px-2 py-1.5 rounded text-[10px] border border-slate-800 outline-none" value={edu.period} onChange={e => handleUpdateEducation(edu.id, 'period', e.target.value)} placeholder="Year" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Certifications List */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2">Certifications</h4>
                  {(data.certifications || []).map(cert => (
                    <div key={cert.id} className="p-3 bg-slate-900/20 rounded-lg relative group border border-slate-800/50">
                       <button onClick={() => removeCertification(cert.id)} className="absolute -top-2 -right-2 bg-red-600/50 text-white h-5 w-5 rounded-full text-[9px] hidden group-hover:flex items-center justify-center font-black">×</button>
                       <div className="grid grid-cols-2 gap-2">
                         <input className="bg-transparent text-[11px] font-bold outline-none border-b border-slate-800 py-1" value={cert.name} onChange={e => handleUpdateCertification(cert.id, 'name', e.target.value)} placeholder="Cert Name" />
                         <input className="bg-transparent text-[10px] outline-none border-b border-slate-800 py-1" value={cert.issuer} onChange={e => handleUpdateCertification(cert.id, 'issuer', e.target.value)} placeholder="Issuer" />
                         <input className="bg-transparent text-[9px] outline-none border-b border-slate-800 py-1" value={cert.date} onChange={e => handleUpdateCertification(cert.id, 'date', e.target.value)} placeholder="Date" />
                       </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-[2px] w-8 bg-blue-500 rounded-full"></div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">7. Languages</h3>
                </div>
                <input className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={data.languages.join(', ')} onChange={e => handleLanguagesChange(e.target.value)} placeholder="English, Shona..." />
              </section>

              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-[2px] w-8 bg-blue-500 rounded-full"></div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">8. References</h3>
                </div>
                <textarea className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none h-20 resize-none" value={data.references} onChange={e => handleReferencesChange(e.target.value)} />
              </section>
            </>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              <h3 className="text-xl font-black text-blue-400">AI WORKSPACE</h3>
              
              {aiAnalysis && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-blue-500/20">
                    <div className="text-2xl font-black text-blue-500">{aiAnalysis.final_score}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {pendingData ? 'Improved Version Score' : 'Current ATS Score'}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <ScoreBar label="Keywords" score={aiAnalysis.category_scores?.keyword_alignment} />
                    <ScoreBar label="Impact" score={aiAnalysis.category_scores?.content_impact} />
                    <ScoreBar label="Format" score={aiAnalysis.category_scores?.formatting_compliance} />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button 
                  onClick={handleAnalyze} 
                  disabled={isProcessing} 
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border border-slate-700"
                >
                  {isProcessing ? 'Thinking...' : pendingData ? 'Re-Evaluate Improved Version' : 'Analyze Current Score'}
                </button>
                
                {!pendingData && (
                  <button onClick={handleImprove} disabled={isProcessing} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20">
                    {isProcessing ? 'Improving...' : 'Start AI Improvement'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI Action Panel (Sticky Bottom) */}
        {viewMode === 'editor' && (
          <div className="p-6 bg-[#020617] border-t border-slate-800 shadow-2xl shrink-0">
            <textarea className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] outline-none focus:border-blue-500 h-16 resize-none mb-4" placeholder="Paste Job Description for AI tailoring..." value={jobDescription} onChange={e => setJobDescription(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={handleAnalyze} disabled={isProcessing} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">ANALYZE</button>
              <button onClick={handleImprove} disabled={isProcessing} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20">IMPROVE</button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className={`flex-1 bg-slate-100 flex flex-col h-full overflow-hidden transition-all ${viewMode === 'review' ? 'md:bg-slate-200' : ''}`}>
        <header className="p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 flex justify-between items-center no-print shadow-sm z-20 shrink-0">
          {viewMode === 'editor' ? (
            <div className="flex justify-center gap-3 w-full">
              <button onClick={() => generatePDF()} disabled={isGeneratingPDF} className={`bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isGeneratingPDF ? 'opacity-50 cursor-wait' : ''}`}>{isGeneratingPDF ? 'Generating...' : 'Generate PDF'}</button>
              <button onClick={() => downloadDocx(data).catch(e => console.error('DOCX download failed:', e))} className="bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">DOCX</button>
              <button onClick={() => downloadMarkdown(data)} className="bg-white border border-slate-200 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-800">Markdown</button>
            </div>
          ) : (
            <div className="flex justify-between w-full px-4">
              <button onClick={() => { setViewMode('editor'); setPendingData(null); setAiAnalysis(null); }} className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Discard & Exit
              </button>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Review AI Enhancements</h2>
              <button onClick={applyImprovements} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20">
                Confirm & Apply Changes
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center scrollbar-hide bg-[#f8fafc]">
          {viewMode === 'editor' ? (
            <div className="shadow-2xl h-fit border border-slate-200 print:shadow-none print:border-none">
              <ResumePreview data={data} />
            </div>
          ) : (
            <div className="w-full max-w-6xl space-y-12 pb-24">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sticky top-0 bg-[#f8fafc]/80 backdrop-blur-sm py-4 z-10">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Original Draft</span>
                </div>
                <div className="bg-blue-600 p-4 rounded-xl shadow-lg flex justify-between items-center">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">AI Enhanced Version</span>
                  <span className="text-[9px] font-bold text-blue-100 bg-blue-700 px-2 py-0.5 rounded-full">Optimized</span>
                </div>
              </div>

              {/* Summary Compare */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Summary Comparison</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <p className="text-sm text-slate-500 leading-relaxed italic">"{data.summary}"</p>
                  <p className="text-sm text-slate-900 leading-relaxed font-medium">"{pendingData?.summary || data.summary}"</p>
                </div>
              </div>

              {/* Experience Comparison */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Experience Comparison</h4>
                {data.experience.map((exp, idx) => {
                  const pendingExp = pendingData?.experience[idx];
                  return (
                    <div key={exp.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <ul className="space-y-3">
                          {exp.bullets.map((b, i) => <li key={i} className="text-[11px] text-slate-500 pl-4 border-l-2 border-slate-100 leading-relaxed">{b}</li>)}
                        </ul>
                        <ul className="space-y-3">
                          {(pendingExp?.bullets || exp.bullets).map((b, i) => <li key={i} className="text-[11px] text-slate-900 font-medium pl-4 border-l-2 border-blue-500 bg-blue-50/50 p-3 rounded-r-xl leading-relaxed shadow-sm">{b}</li>)}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Projects Comparison */}
              {data.projects && data.projects.length > 0 && (
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Projects Comparison</h4>
                  {data.projects.map((proj, idx) => {
                    const pendingProj = pendingData?.projects[idx];
                    return (
                      <div key={proj.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                          <p className="text-[11px] text-slate-500">{proj.description}</p>
                          <p className="text-[11px] text-slate-900 font-medium bg-blue-50/50 p-3 rounded-xl">{pendingProj?.description || proj.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
