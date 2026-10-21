import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Category {
  name: string;
  color: string;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string | null;
  due_date?: string | null;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'done';
  due_date?: string;
  created_at: string;
  updated_at: string;
  categories?: { category: Category }[];
  subtasks?: Subtask[];
  recurrence_type?: string | null;
}

export interface ReportOptions {
  includeSubtasks?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

function getPriorityLabel(p: string): string {
  return p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa';
}

function getStatusLabel(s: string): string {
  return s === 'done' ? 'Concluída' : 'Pendente';
}

function formatDateShort(date?: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

// Data em 2 linhas: data + hora (com \n para o autoTable respeitar)
function formatDateTime2Lines(date?: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  const day = d.toLocaleDateString('pt-BR');
  const time = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day}\n${time}`;
}

function getRecurrenceLabel(type: string | null | undefined): string {
  if (!type) return '';
  const labels: Record<string, string> = {
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
  };
  return labels[type] || '';
}

function sortSubtasks(subtasks: Subtask[]): Subtask[] {
  return [...subtasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

interface TableRow {
  isSubtask: boolean;
  cells: string[];
  priority?: string;
  status?: string;
  isCompleted?: boolean;
  isOverdue?: boolean;
}

export function generateTasksReport(
  tasks: Task[],
  userName: string,
  options: ReportOptions = {}
) {
  const { includeSubtasks = true, dateFrom, dateTo } = options;

  // 🆕 ORIENTAÇÃO PAISAGEM — dá muito mais espaço horizontal
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

  // ============================================
  // HEADER
  // ============================================
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DevLife', 14, 12);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Tarefas', 14, 19);

  // ============================================
  // INFO DO USUÁRIO + PERÍODO
  // ============================================
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Usuário: ${userName}`, 14, 33);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 38);

  let infoY = 38;
  if (dateFrom || dateTo) {
    infoY += 5;
    const periodText =
      dateFrom && dateTo
        ? `Período: ${formatDateShort(dateFrom)} até ${formatDateShort(dateTo)}`
        : dateFrom
        ? `A partir de: ${formatDateShort(dateFrom)}`
        : `Até: ${formatDateShort(dateTo)}`;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8.5);
    doc.text(periodText, 14, infoY);
  }

  // ============================================
  // RESUMO (cards)
  // ============================================
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const overdue = tasks.filter(
    (t) =>
      t.status === 'pending' &&
      t.due_date &&
      new Date(t.due_date) < new Date()
  ).length;

  const totalSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0);
  const completedSubtasks = tasks.reduce(
    (acc, t) => acc + (t.subtasks?.filter((s) => s.completed).length || 0),
    0
  );

  const startY = infoY + 6;
  const boxWidth = (pageWidth - 28 - 6) / 4;
  const boxHeight = 14;

  // Box 1 - Tarefas
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, startY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('TAREFAS', 14 + boxWidth / 2, startY + 5, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(tasks.length), 14 + boxWidth / 2, startY + 11, { align: 'center' });

  // Box 2 - Pendentes
  doc.setFillColor(254, 249, 195);
  doc.roundedRect(14 + boxWidth + 2, startY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setTextColor(180, 130, 20);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('PENDENTES', 14 + boxWidth + 2 + boxWidth / 2, startY + 5, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(pending), 14 + boxWidth + 2 + boxWidth / 2, startY + 11, { align: 'center' });

  // Box 3 - Concluídas
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(14 + (boxWidth + 2) * 2, startY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('CONCLUÍDAS', 14 + (boxWidth + 2) * 2 + boxWidth / 2, startY + 5, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(done), 14 + (boxWidth + 2) * 2 + boxWidth / 2, startY + 11, { align: 'center' });

  // Box 4 - Atrasadas
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(14 + (boxWidth + 2) * 3, startY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setTextColor(153, 27, 27);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('ATRASADAS', 14 + (boxWidth + 2) * 3 + boxWidth / 2, startY + 5, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(overdue), 14 + (boxWidth + 2) * 3 + boxWidth / 2, startY + 11, { align: 'center' });

  // Barra de subtarefas
  let subtasksY = startY + boxHeight + 4;
  if (includeSubtasks && totalSubtasks > 0) {
    doc.setFillColor(243, 232, 255);
    doc.roundedRect(14, subtasksY, pageWidth - 28, 9, 2, 2, 'F');
    doc.setTextColor(107, 33, 168);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Subtarefas: ${completedSubtasks}/${totalSubtasks} concluídas`,
      14 + 4,
      subtasksY + 6
    );
    subtasksY += 13;
  }

  // ============================================
  // MONTAGEM DAS LINHAS
  // ============================================
  const tableRows: TableRow[] = [];

  tasks.forEach((task, taskIndex) => {
    const subtasks =
      includeSubtasks && task.subtasks ? sortSubtasks(task.subtasks) : [];
    const completedCount = subtasks.filter((s) => s.completed).length;
    const totalSub = subtasks.length;

    const isTaskOverdue =
      task.status === 'pending' &&
      task.due_date &&
      new Date(task.due_date) < new Date();

    // Linha da tarefa principal
    tableRows.push({
      isSubtask: false,
      cells: [
        String(taskIndex + 1),
        task.title +
          (task.recurrence_type
            ? `  [${getRecurrenceLabel(task.recurrence_type)}]`
            : ''),
        getPriorityLabel(task.priority),
        getStatusLabel(task.status),
        formatDateTime2Lines(task.due_date),
        task.categories?.map((c) => c.category.name).join(', ') || '-',
        totalSub > 0 ? `${completedCount}/${totalSub}` : '-',
      ],
      priority: task.priority,
      status: task.status,
      isOverdue: !!isTaskOverdue,
    });

    // Linhas das subtarefas
    subtasks.forEach((subtask) => {
      const isSubtaskOverdue =
        !subtask.completed &&
        subtask.due_date &&
        new Date(subtask.due_date) < new Date();

      tableRows.push({
        isSubtask: true,
        cells: [
          '',
          // 🆕 SEM `↳` (usa indentação via cellPadding para dar mais espaço)
          subtask.title,
          '',
          subtask.completed ? 'Concluída' : 'Pendente',
          formatDateTime2Lines(subtask.due_date),
          '',
          '',
        ],
        isCompleted: subtask.completed,
        isOverdue: !!isSubtaskOverdue,
      });
    });
  });

  // ============================================
  // 🆕 CÁLCULO DAS LARGURAS (landscape = 269mm úteis)
  // ============================================
  // Larguras fixas:
  // 0 (#): 8 | 2 (prior): 18 | 3 (status): 22 | 4 (data): 26 | 6 (sub): 12
  // Fixo total: 86mm
  // Coluna 1 (título): 143mm | Coluna 5 (categorias): 40mm
  const COL_WIDTHS = {
    0: 8,
    1: 143, // 🆕 muito espaço para o título
    2: 18,
    3: 22,
    4: 26,
    5: 40,
    6: 12,
  };

  // ============================================
  // TABELA
  // ============================================
  autoTable(doc, {
    startY: subtasksY,
    margin: { left: 14, right: 14, top: 14, bottom: 14 },
    head: [
      ['#', 'Tarefa / Subtarefa', 'Prior.', 'Status', 'Vencimento', 'Categorias', 'Sub.'],
    ],
    body: tableRows.map((r) => r.cells),
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      valign: 'middle',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      overflow: 'linebreak', // 🆕 garante quebra de linha em QUALQUER célula
      valign: 'top',
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253],
    },
    columnStyles: {
      0: { cellWidth: COL_WIDTHS[0], halign: 'center', valign: 'middle' },
      1: { cellWidth: COL_WIDTHS[1], halign: 'left', overflow: 'linebreak' },
      2: { cellWidth: COL_WIDTHS[2], halign: 'center', valign: 'middle' },
      3: { cellWidth: COL_WIDTHS[3], halign: 'center', valign: 'middle' },
      4: { cellWidth: COL_WIDTHS[4], halign: 'center', valign: 'middle', overflow: 'linebreak' },
      5: { cellWidth: COL_WIDTHS[5], halign: 'left', overflow: 'linebreak', valign: 'middle' },
      6: { cellWidth: COL_WIDTHS[6], halign: 'center', valign: 'middle' },
    },
    didParseCell: (data) => {
      const rowData = tableRows[data.row.index];
      if (!rowData) return;

      // ============================================
      // SUBTAREFAS
      // ============================================
      if (rowData.isSubtask) {
        data.cell.styles.fillColor = [245, 247, 250];
        data.cell.styles.fontSize = 8;

        if (data.column.index === 1) {
          data.cell.styles.fontStyle = 'italic';
          data.cell.styles.textColor = [40, 40, 40];
          // 🆕 Indentação visual pelo padding-left (mais confiável que `↳`)
          data.cell.styles.cellPadding = {
            top: 2.5,
            right: 3,
            bottom: 2.5,
            left: 8,
          };
        }

        if (data.column.index === 3) {
          data.cell.styles.fontSize = 7.5;
          if (rowData.isCompleted) {
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = 'bold';
          } else if (rowData.isOverdue) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [120, 120, 120];
          }
        }

        if (data.column.index === 4) {
          data.cell.styles.fontSize = 7.5;
          if (rowData.isOverdue) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else if (rowData.isCompleted) {
            data.cell.styles.textColor = [120, 120, 120];
          } else {
            data.cell.styles.textColor = [37, 99, 235];
            data.cell.styles.fontStyle = 'bold';
          }
        }

        if (
          data.column.index === 0 ||
          data.column.index === 2 ||
          data.column.index === 5 ||
          data.column.index === 6
        ) {
          data.cell.styles.textColor = [200, 200, 200];
        }

        return;
      }

      // ============================================
      // TAREFAS PRINCIPAIS
      // ============================================
      if (data.column.index === 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [17, 24, 39];
        data.cell.styles.fontSize = 9;
      }

      if (data.column.index === 2) {
        if (data.cell.raw === 'Alta') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'Média') {
          data.cell.styles.textColor = [180, 130, 20];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        }
      }

      if (data.column.index === 3) {
        if (data.cell.raw === 'Concluída') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [100, 100, 100];
        }
      }

      if (data.column.index === 4 && rowData.isOverdue) {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ============================================
  // FOOTER
  // ============================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(`DevLife - Relatório de Tarefas`, pageWidth / 2, pageHeight - 10, {
      align: 'center',
    });
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 6, {
      align: 'center',
    });
  }

  const filename = `relatorio-tarefas-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}