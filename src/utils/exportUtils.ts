import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { StudyGuide } from "../types";

export function exportToPDF(guide: StudyGuide) {
  const doc = new jsPDF();
  let y = 20;

  // Title
  doc.setFontSize(22);
  doc.text(guide.title, 20, y);
  y += 15;

  // Summary
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 20, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const summaryLines = doc.splitTextToSize(guide.summary, 170);
  doc.text(summaryLines, 20, y);
  y += summaryLines.length * 5 + 10;

  // Key Takeaways
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Key Takeaways", 20, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  guide.keyTakeaways.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 2;
    if (y > 270) { doc.addPage(); y = 20; }
  });
  y += 10;

  // Structured Notes
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Structured Notes", 20, y);
  y += 10;
  doc.setFontSize(11);
  guide.structuredNotes.forEach((note) => {
    doc.setFont("helvetica", "bold");
    doc.text(note.title, 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    const contentLines = doc.splitTextToSize(note.content, 170);
    doc.text(contentLines, 20, y);
    y += contentLines.length * 5 + 5;
    
    if (note.subtopics) {
      note.subtopics.forEach(sub => {
        doc.setFont("helvetica", "bold");
        doc.text(`  ${sub.title}`, 25, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        const subContentLines = doc.splitTextToSize(sub.content, 160);
        doc.text(subContentLines, 25, y);
        y += subContentLines.length * 5 + 5;
        if (y > 270) { doc.addPage(); y = 20; }
      });
    }

    if (y > 270) { doc.addPage(); y = 20; }
  });

  // Flashcards
  doc.addPage();
  y = 20;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Flashcards", 20, y);
  y += 15;
  
  guide.flashcards.forEach((card, index) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Q${index + 1}: ${card.question}`, 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    const answerLines = doc.splitTextToSize(`A: ${card.answer}`, 170);
    doc.text(answerLines, 20, y);
    y += answerLines.length * 5 + 10;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  doc.save(`${guide.title.replace(/\s+/g, '_')}_StudyGuide.pdf`);
}

export function exportToTXT(guide: StudyGuide) {
  let content = `${guide.title.toUpperCase()}\n\n`;
  content += `SUMMARY\n${guide.summary}\n\n`;
  content += `KEY TAKEAWAYS\n${guide.keyTakeaways.map(t => `- ${t}`).join('\n')}\n\n`;
  content += `STRUCTURED NOTES\n`;
  guide.structuredNotes.forEach(note => {
    content += `\n${note.title}\n${note.content}\n`;
    note.subtopics?.forEach(sub => {
      content += `  - ${sub.title}: ${sub.content}\n`;
    });
  });
  content += `\nFLASHCARDS\n`;
  guide.flashcards.forEach((card, i) => {
    content += `Q${i+1}: ${card.question}\nA: ${card.answer}\n\n`;
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${guide.title.replace(/\s+/g, '_')}_Notes.txt`;
  link.click();
}
