import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Category {
  name: string;
  color: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  categories?: { category: Category }[];
}

export function generateNotesReport(notes: Note[], userName: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(139, 92, 246); // roxo
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DevLife', 14, 14);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Notas', 14, 22);

  // Info
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.text(`Usuário: ${userName}`, 14, 40);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 46);
  doc.text(`Total de notas: ${notes.length}`, 14, 52);

  // Tabela resumida
  const tableData = notes.map((n, i) => [
    String(i + 1),
    n.title.length > 50 ? n.title.substring(0, 47) + '...' : n.title,
    new Date(n.created_at).toLocaleDateString('pt-BR'),
    n.categories?.map((c) => c.category.name).join(', ') || '-',
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['#', 'Título', 'Criada em', 'Categorias']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 50 },
    },
  });

  // Conteúdo completo de cada nota
  let currentY = (doc as any).lastAutoTable.finalY + 15;

  notes.forEach((note, index) => {
    // Nova página se necessário
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }

    // Título da nota
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(`${index + 1}. ${note.title}`, 14, currentY);
    currentY += 5;

    // Data
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Criada em: ${new Date(note.created_at).toLocaleString('pt-BR')}`,
      14,
      currentY
    );
    currentY += 5;

    // Categorias
    if (note.categories && note.categories.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(139, 92, 246);
      doc.text(
        `Categorias: ${note.categories.map((c) => c.category.name).join(', ')}`,
        14,
        currentY
      );
      currentY += 5;
    }

    // Conteúdo (com quebra de linha automática)
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(note.content, pageWidth - 28);
    const lineHeight = 5;

    lines.forEach((line: string) => {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, 14, currentY);
      currentY += lineHeight;
    });

    currentY += 5;

    // Linha separadora
    doc.setDrawColor(220, 220, 220);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `DevLife - Relatório de Notas - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  doc.save(`relatorio-notas-${new Date().toISOString().slice(0, 10)}.pdf`);
}