
import React from 'react';
import { ResumeData } from '../types';

interface ResumePreviewProps {
  data: ResumeData;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ data }) => {
  return (
    <div 
      id="resume-preview"
      className="bg-white p-12 shadow-2xl mx-auto font-serif text-[#000000] leading-snug w-[210mm] min-h-[297mm] print:shadow-none print:p-0"
      style={{ 
        fontFamily: "'Playfair Display', serif", 
        fontSize: '10pt',
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold mb-1 uppercase tracking-tight">{data.profile.fullName}</h1>
        <div className="text-[8.5pt] text-slate-700">
          <span>{data.profile.phone}</span>
          <span className="mx-1.5">•</span>
          <span>{data.profile.email}</span>
          <span className="mx-1.5">•</span>
          <span>{data.profile.location}</span>
        </div>
        {(data.profile.website || data.profile.linkedin) && (
          <div className="text-[8.5pt] text-slate-700 mt-0.5">
            {data.profile.website && (
              <>
                <span className="font-medium">Portfolio:</span> {data.profile.website.replace(/^https?:\/\//, '')}
                {data.profile.linkedin && <span className="mx-1.5">•</span>}
              </>
            )}
            {data.profile.linkedin && (
              <>
                <span className="font-medium">LinkedIn:</span> {data.profile.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
              </>
            )}
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        
        {/* Profile */}
        <section>
          <h2 className="font-bold border-b border-black text-[10.5pt] mb-1">PROFILE</h2>
          <p className="text-justify text-[9.5pt] mt-2 leading-relaxed">
            {data.summary}
          </p>
        </section>

        {/* Technical Strengths */}
        <section>
          <h2 className="font-bold border-b border-black text-[10.5pt] mb-2">TECHNICAL SKILLS AND STRENGTHS</h2>
          <div className="grid grid-cols-2 gap-x-8 text-[9.5pt] mt-1 px-4">
            <ul className="list-disc space-y-0.5">
              {data.technicalStrengths.slice(0, Math.ceil(data.technicalStrengths.length / 2)).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <ul className="list-disc space-y-0.5">
              {data.technicalStrengths.slice(Math.ceil(data.technicalStrengths.length / 2)).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Experience */}
        <section>
          <h2 className="font-bold border-b border-black text-[10.5pt] mb-3">EXPERIENCE</h2>
          <div className="space-y-5">
            {data.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline font-bold text-[10pt]">
                  <span>{exp.company}</span>
                  <span>{exp.location}</span>
                </div>
                <div className="flex justify-between items-baseline italic text-[9.5pt] mb-1">
                  <span>{exp.title}</span>
                  <span>{exp.period}</span>
                </div>
                <ul className="list-disc ml-5 space-y-0.5 text-[9.2pt]">
                  {exp.bullets.map((bullet, idx) => (
                    <li key={idx} className="pl-1 text-justify">{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Projects */}
        {data.projects && data.projects.length > 0 && (
          <section>
            <h2 className="font-bold border-b border-black text-[10.5pt] mb-3">PROJECTS</h2>
            <div className="space-y-4">
              {data.projects.map((proj) => (
                <div key={proj.id}>
                  <div className="flex justify-between items-baseline font-bold text-[10pt]">
                    <span>{proj.title}</span>
                    {proj.associatedWith && <span className="text-[9pt] font-normal italic">Associated with {proj.associatedWith}</span>}
                  </div>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="text-[8.5pt] italic mb-1 text-slate-700">
                      Technologies: {proj.technologies.join(', ')}
                    </div>
                  )}
                  <p className="text-[9.2pt] text-justify leading-relaxed">{proj.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education & Certifications */}
        <section>
          <h2 className="font-bold border-b border-black text-[10.5pt] mb-2">EDUCATION & QUALIFICATION</h2>
          <div className="space-y-3">
            {data.education.map((edu) => (
              <div key={edu.id} className="text-[9.5pt]">
                <div className="font-bold flex justify-between">
                  <span>{edu.institution}</span>
                  <span className="font-normal italic text-[9pt]">{edu.period}</span>
                </div>
                <div>{edu.qualification}</div>
                {edu.details && <div className="mt-0.5 text-[9pt]">{edu.details}</div>}
              </div>
            ))}
            
            {/* Certifications Sub-section */}
            {data.certifications && data.certifications.length > 0 && (
              <div className="mt-4">
                <h3 className="font-bold text-[9.5pt] mb-1 italic">Professional Certifications</h3>
                <ul className="list-disc ml-5 space-y-0.5 text-[9.2pt]">
                  {data.certifications.map((cert) => (
                    <li key={cert.id}>
                      <span className="font-bold">{cert.name}</span> — {cert.issuer} ({cert.date})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Languages */}
        <section>
          <h2 className="font-bold border-b border-black text-[10.5pt] mb-1">LANGUAGES</h2>
          <p className="text-[9.5pt] mt-1">{data.languages.join(', ')}.</p>
        </section>

        {/* References */}
        <section>
          <h2 className="font-bold border-b border-black text-[10.5pt] mb-1">REFERENCES</h2>
          <p className="text-[9.5pt] mt-1">{data.references}</p>
        </section>

      </div>
    </div>
  );
};

export default ResumePreview;
