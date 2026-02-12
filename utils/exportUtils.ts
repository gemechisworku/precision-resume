
import { ResumeData } from "../types";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";

/**
 * Helper to trigger a file download from a Blob
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Clean up after a short delay to ensure download starts
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Get a safe filename from the user's full name
 */
function getSafeFilename(fullName: string, extension: string): string {
  const name = fullName?.trim() ? fullName.replace(/\s+/g, '_') : 'Resume';
  return `${name}_Resume.${extension}`;
}

export const generateMarkdown = (data: ResumeData): string => {
  const expStr = data.experience.map(exp => `
### ${exp.company} | ${exp.location}
*${exp.title} | ${exp.period}*
${exp.bullets.map(b => `* ${b}`).join('\n')}
  `).join('\n');

  const eduStr = data.education.map(edu => `
* **${edu.institution}**
  ${edu.qualification} | ${edu.period}
  ${edu.details || ''}
  `).join('\n');

  const certStr = data.certifications && data.certifications.length > 0
    ? `\n## CERTIFICATIONS\n${data.certifications.map(cert => `* **${cert.name}** — ${cert.issuer} (${cert.date})`).join('\n')}`
    : '';

  const projStr = data.projects && data.projects.length > 0
    ? `\n## PROJECTS\n${data.projects.map(proj => `### ${proj.title}${proj.associatedWith ? ` (${proj.associatedWith})` : ''}\n${proj.description}${proj.technologies?.length ? `\n*Technologies: ${proj.technologies.join(', ')}*` : ''}`).join('\n\n')}`
    : '';

  return `
# ${data.profile.fullName.toUpperCase()}
Ph. No: ${data.profile.phone} | E-mail: ${data.profile.email} | ${data.profile.location}
${data.profile.website ? `Portfolio: ${data.profile.website}` : ''}${data.profile.linkedin ? ` | LinkedIn: ${data.profile.linkedin}` : ''}

## PROFILE
${data.summary}

## TECHNICAL SKILLS AND STRENGTHS
${data.technicalStrengths.map(s => `* ${s}`).join('\n')}

## EXPERIENCE
${expStr}

## EDUCATION & QUALIFICATION
${eduStr}
${certStr}
${projStr}

## LANGUAGES
${data.languages.join(', ')}

## REFERENCES
${data.references}
  `.trim();
};

export const downloadMarkdown = (data: ResumeData) => {
  try {
    const md = generateMarkdown(data);
    const blob = new Blob([md], { type: 'text/markdown' });
    triggerDownload(blob, getSafeFilename(data.profile.fullName, 'md'));
  } catch (error) {
    console.error('Failed to download Markdown:', error);
    alert('Failed to generate Markdown file. Please try again.');
  }
};

export const downloadDocx = async (data: ResumeData) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header - Name
          new Paragraph({
            children: [new TextRun({ text: data.profile.fullName, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
          }),
          // Header - Contact Info
          new Paragraph({
            children: [
              new TextRun({ text: `Ph. No: ${data.profile.phone} | E-mail: ${data.profile.email} | ${data.profile.location}` }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          // Header - Website/LinkedIn (if available)
          ...(data.profile.website || data.profile.linkedin ? [
            new Paragraph({
              children: [
                new TextRun({ 
                  text: [
                    data.profile.website ? `Portfolio: ${data.profile.website}` : '',
                    data.profile.linkedin ? `LinkedIn: ${data.profile.linkedin}` : '',
                  ].filter(Boolean).join(' | ')
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
          ] : []),

          // PROFILE / SUMMARY
          ...createDocxSection("PROFILE", [
            new Paragraph({ text: data.summary, spacing: { before: 120 } })
          ]),

          // TECHNICAL SKILLS AND STRENGTHS
          ...createDocxSection("TECHNICAL SKILLS AND STRENGTHS", [
            new Paragraph({ text: data.technicalStrengths.join(", "), spacing: { before: 120 } })
          ]),

          // EXPERIENCE
          ...createDocxSection("EXPERIENCE", data.experience.flatMap(exp => [
            new Paragraph({
              children: [
                new TextRun({ text: exp.company, bold: true }),
                new TextRun({ text: `    ${exp.location}`, bold: true })
              ],
              spacing: { before: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: exp.title, italics: true }),
                new TextRun({ text: `    ${exp.period}`, italics: true })
              ],
            }),
            ...exp.bullets.map(b => new Paragraph({ text: b, bullet: { level: 0 } }))
          ])),

          // EDUCATION & QUALIFICATION
          ...createDocxSection("EDUCATION & QUALIFICATION", data.education.flatMap(edu => [
            new Paragraph({
              children: [
                new TextRun({ text: edu.institution, bold: true }),
                new TextRun({ text: `    ${edu.period}` })
              ],
              spacing: { before: 120 },
            }),
            new Paragraph({ text: edu.qualification }),
            ...(edu.details ? [new Paragraph({ text: edu.details, spacing: { before: 60 } })] : []),
          ])),

          // CERTIFICATIONS
          ...(data.certifications && data.certifications.length > 0
            ? createDocxSection("CERTIFICATIONS", data.certifications.map(cert =>
                new Paragraph({
                  children: [
                    new TextRun({ text: cert.name, bold: true }),
                    new TextRun({ text: ` — ${cert.issuer} (${cert.date})` }),
                  ],
                  bullet: { level: 0 },
                })
              ))
            : []),

          // PROJECTS
          ...(data.projects && data.projects.length > 0
            ? createDocxSection("PROJECTS", data.projects.flatMap(proj => [
                new Paragraph({
                  children: [
                    new TextRun({ text: proj.title, bold: true }),
                    ...(proj.associatedWith ? [new TextRun({ text: ` (${proj.associatedWith})` })] : []),
                  ],
                  spacing: { before: 120 },
                }),
                new Paragraph({ text: proj.description }),
                ...(proj.technologies?.length ? [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Technologies: ', bold: true, size: 18 }),
                      new TextRun({ text: proj.technologies.join(', '), size: 18, italics: true }),
                    ],
                    spacing: { before: 60 },
                  })
                ] : []),
              ]))
            : []),

          // LANGUAGES
          ...createDocxSection("LANGUAGES", [
            new Paragraph({ text: data.languages.join(', '), spacing: { before: 120 } })
          ]),

          // REFERENCES
          ...createDocxSection("REFERENCES", [
            new Paragraph({ text: data.references, spacing: { before: 120 } })
          ]),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    triggerDownload(blob, getSafeFilename(data.profile.fullName, 'docx'));
  } catch (error) {
    console.error('Failed to download DOCX:', error);
    alert('Failed to generate DOCX file. Please try again.');
  }
};

function createDocxSection(title: string, content: Paragraph[]) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: title, bold: true, size: 24 })],
      border: { bottom: { color: "000000", space: 1, value: BorderStyle.SINGLE, size: 6 } },
      spacing: { before: 200 }
    }),
    ...content
  ];
}
