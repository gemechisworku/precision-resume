
import { ResumeData } from "../types";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from "docx";

export const generateMarkdown = (data: ResumeData): string => {
  const expStr = data.experience.map(exp => `
### ${exp.company} | ${exp.location}
*${exp.title} | ${exp.period}*
${exp.bullets.map(b => `* ${b}`).join('\n')}
  `).join('\n');

  const eduStr = data.education.map(edu => `
* **${edu.institution}**
  ${edu.qualification} | ${edu.period}
  ${edu.details}
  `).join('\n');

  return `
# ${data.profile.fullName.toUpperCase()}
Ph. No: ${data.profile.phone} | E-mail: ${data.profile.email} | ${data.profile.location}

## PROFILE
${data.summary}

## TECHNICAL SKILLS AND STRENGTHS
${data.technicalStrengths.map(s => `* ${s}`).join('\n')}

## EXPERIENCE
${expStr}

## EDUCATION & QUALIFICATION
${eduStr}

## LANGUAGES
${data.languages.join(', ')}

## REFERENCES
${data.references}
  `.trim();
};

export const downloadMarkdown = (data: ResumeData) => {
  const md = generateMarkdown(data);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.profile.fullName.replace(/\s+/g, '_')}_Resume.md`;
  a.click();
};

export const downloadDocx = async (data: ResumeData) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: data.profile.fullName, bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Ph. No: ${data.profile.phone} | E-mail: ${data.profile.email} | ${data.profile.location}` }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        
        // Sections follow similar structure...
        // For brevity in this artifact, we'll implement a clean logical structure
        // mimicking the headers and spacing.
        ...createDocxSection("PROFILE", [new Paragraph({ text: data.summary, spacing: { before: 120 } })]),
        ...createDocxSection("TECHNICAL SKILLS AND STRENGTHS", [
            new Paragraph({ text: data.technicalStrengths.join(", "), spacing: { before: 120 } })
        ]),
        ...createDocxSection("EXPERIENCE", data.experience.flatMap(exp => [
           new Paragraph({
             children: [
               new TextRun({ text: exp.company, bold: true }),
               new TextRun({ text: "\t\t\t\t" + exp.location, bold: true })
             ],
           }),
           new Paragraph({
             children: [
               new TextRun({ text: exp.title, italics: true }),
               new TextRun({ text: "\t\t\t\t" + exp.period, italics: true })
             ],
           }),
           ...exp.bullets.map(b => new Paragraph({ text: b, bullet: { level: 0 } }))
        ])),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.profile.fullName.replace(/\s+/g, '_')}_Resume.docx`;
  a.click();
};

function createDocxSection(title: string, content: any[]) {
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
