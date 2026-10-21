import jsPDF from 'jspdf';
import { formatApiTime, getApiDayKey } from '../datetime';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string | null;
}

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'done';
  due_date?: string;
  subtasks?: Subtask[];
  categories?: { category: Category }[];
}

export interface PeriodicReportOptions {
  type: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
}

interface CellItem {
  title: string;
  time: string;
  type: 'task' | 'subtask';
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

const WEEKDAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PRIORITY_RGB: Record<string, [number, number, number]> = {
  high: [220, 38, 38],
  medium: [217, 119, 6],
  low: [22, 163, 74],
};

// Retorna uma data com dia/mês/ano como string única
function getDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 🔹 Trunca texto com "…" se exceder a largura
function truncateText(
  doc: jsPDF,
  text: string,
  maxWidth: number
): string {
  let result = text;
  while (doc.getTextWidth(result) > maxWidth && result.length > 0) {
    result = result.slice(0, -1);
  }
  if (result !== text) {
    result = result.slice(0, -1) + '…';
  }
  return result;
}

export function generatePeriodicReport(
  tasks: Task[],
  userName: string,
  options: PeriodicReportOptions
) {
  const { type, startDate, endDate } = options;
  const isWeekly = type === 'weekly';

  // ============================================
  // AGRUPAR ITENS POR DIA
  // ============================================
  const itemsByDay = new Map<string, CellItem[]>();

  tasks.forEach((task) => {
    if (task.due_date) {
      const key = getApiDayKey(task.due_date);
      if (!itemsByDay.has(key)) itemsByDay.set(key, []);
      itemsByDay.get(key)!.push({
        title: task.title,
        time: formatApiTime(task.due_date),
        type: 'task',
        completed: task.status === 'done',
        priority: task.priority,
      });
    }

    task.subtasks?.forEach((sub) => {
      if (sub.due_date) {
        const key = getApiDayKey(sub.due_date);
        if (!itemsByDay.has(key)) itemsByDay.set(key, []);
        itemsByDay.get(key)!.push({
          title: sub.title,
          time: formatApiTime(sub.due_date),
          type: 'subtask',
          completed: sub.completed,
          priority: task.priority,
        });
      }
    });
  });

  // Ordena cada dia por hora
  itemsByDay.forEach((items) => {
    items.sort((a, b) => a.time.localeCompare(b.time));
  });

  // ============================================
  // CRIA O DOCUMENTO (paisagem)
  // ============================================
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const headerHeight = 26;
  const weekdayHeaderHeight = 8;
  const footerHeight = 6;

  const headerColor: [number, number, number] = isWeekly
    ? [37, 99, 235]
    : [139, 92, 246];

  // ============================================
  // CABEÇALHO
  // ============================================
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DevLife', margin, 12);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(isWeekly ? 'Relatório Semanal' : 'Relatório Mensal', margin, 19);

  // Info do período (direita)
  const periodLabel = isWeekly
    ? `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`
    : `${MONTHS_FULL[startDate.getMonth()]} de ${startDate.getFullYear()}`;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(periodLabel, pageWidth - margin, 12, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(userName, pageWidth - margin, 19, { align: 'right' });

  // ============================================
  // GRID DIMENSIONS
  // ============================================
  const gridTop = headerHeight + 2;
  const gridLeft = margin;
  const gridWidth = pageWidth - margin * 2;
  const gridHeight = pageHeight - gridTop - footerHeight;
  const colWidth = gridWidth / 7;
  const bodyTop = gridTop + weekdayHeaderHeight;
  const bodyHeight = gridHeight - weekdayHeaderHeight;

  // Cabeçalho dos dias da semana
  doc.setFillColor(245, 245, 250);
  doc.rect(gridLeft, gridTop, gridWidth, weekdayHeaderHeight, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(90, 90, 90);

  for (let i = 0; i < 7; i++) {
    const x = gridLeft + i * colWidth;
    doc.text(WEEKDAYS_SHORT[i], x + colWidth / 2, gridTop + 5.5, {
      align: 'center',
    });
  }

  // ============================================
  // DESENHA O GRID
  // ============================================
  doc.setDrawColor(210, 210, 215);
  doc.setLineWidth(0.2);

  if (isWeekly) {
    drawWeeklyGrid(
      doc,
      itemsByDay,
      startDate,
      gridLeft,
      bodyTop,
      colWidth,
      bodyHeight
    );
  } else {
    drawMonthlyGrid(
      doc,
      itemsByDay,
      startDate,
      gridLeft,
      bodyTop,
      colWidth,
      bodyHeight
    );
  }

  // ============================================
  // RODAPÉ
  // ============================================
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `DevLife · ${isWeekly ? 'Relatório Semanal' : 'Relatório Mensal'} · Gerado em ${new Date().toLocaleString('pt-BR')}`,
    pageWidth / 2,
    pageHeight - 2,
    { align: 'center' }
  );

  // ============================================
  // SALVAR
  // ============================================
  const periodSlug = isWeekly
    ? `semana-${startDate.toLocaleDateString('pt-BR').replace(/\//g, '-')}`
    : `mes-${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

  doc.save(`relatorio-${periodSlug}.pdf`);
}

// ============================================
// LAYOUT SEMANAL — 7 colunas, cada uma com o dia inteiro
// ============================================
function drawWeeklyGrid(
  doc: jsPDF,
  itemsByDay: Map<string, CellItem[]>,
  startDate: Date,
  gridLeft: number,
  bodyTop: number,
  colWidth: number,
  bodyHeight: number
) {
  const todayKey = getDayKey(new Date());

  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    const dayKey = getDayKey(day);

    const x = gridLeft + i * colWidth;
    const isToday = dayKey === todayKey;
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    // Fundo da célula
    if (isToday) {
      doc.setFillColor(239, 246, 255); // azul claro
    } else if (isWeekend) {
      doc.setFillColor(250, 250, 252); // quase branco
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(x, bodyTop, colWidth, bodyHeight, 'F');

    // Borda esquerda (linha de separação)
    doc.setDrawColor(220, 220, 225);
    doc.line(x, bodyTop, x, bodyTop + bodyHeight);

    // Cabeçalho do dia (dia da semana + número)
    const dayHeaderHeight = 8;
    const dayHeaderFill: [number, number, number] = isToday
    ? [219, 234, 254]
    : [248, 248, 252];
    doc.setFillColor(dayHeaderFill[0], dayHeaderFill[1], dayHeaderFill[2]);
    doc.rect(x, bodyTop, colWidth, dayHeaderHeight, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(isToday ? 37 : 120, isToday ? 99 : 120, isToday ? 235 : 120);
    doc.text(
      ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][day.getDay()],
      x + colWidth / 2,
      bodyTop + 3.2,
      { align: 'center' }
    );

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isToday ? 37 : 30, isToday ? 99 : 30, isToday ? 235 : 30);
    doc.text(
      String(day.getDate()),
      x + colWidth / 2,
      bodyTop + 7.2,
      { align: 'center' }
    );

    // Itens do dia
    const items = itemsByDay.get(dayKey) || [];
    const contentStart = bodyTop + dayHeaderHeight + 1.5;
    const contentEnd = bodyTop + bodyHeight - 1;
    const availableHeight = contentEnd - contentStart;
    const itemHeight = 5.5;
    const maxItems = Math.floor(availableHeight / itemHeight);

    doc.setFontSize(6.5);

    if (items.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(190, 190, 195);
      doc.text('—', x + colWidth / 2, contentStart + 3, { align: 'center' });
    } else {
      items.slice(0, maxItems).forEach((item, idx) => {
        const itemY = contentStart + idx * itemHeight;

        // Barra colorida à esquerda
        const rgb = item.completed ? [180, 180, 180] : PRIORITY_RGB[item.priority];
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(x + 1, itemY + 0.5, 0.8, itemHeight - 1.5, 'F');

        // Hora
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(item.completed ? 160 : 80, item.completed ? 160 : 80, item.completed ? 160 : 80);
        doc.text(item.time, x + 2.5, itemY + 2);

        // Título (truncado)
        doc.setFont('helvetica', item.completed ? 'normal' : 'bold');
        doc.setFontSize(6);
        doc.setTextColor(
          item.completed ? 150 : 30,
          item.completed ? 150 : 30,
          item.completed ? 150 : 30
        );

        const prefix = item.type === 'subtask' ? '↳ ' : '';
        const rawText = prefix + item.title;
        const maxTitleWidth = colWidth - 4;
        const truncated = truncateText(doc, rawText, maxTitleWidth);

        doc.text(truncated, x + 2.5, itemY + 4.3);

        // Riscar se completo
        if (item.completed) {
          const textWidth = doc.getTextWidth(truncated);
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.15);
          doc.line(x + 2.5, itemY + 4, x + 2.5 + textWidth, itemY + 4);
        }
      });

      // Indicador de overflow
      if (items.length > maxItems) {
        const moreY = contentStart + maxItems * itemHeight + 1.5;
        if (moreY < contentEnd) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6);
          doc.setTextColor(120, 120, 120);
          doc.text(
            `+${items.length - maxItems} mais`,
            x + colWidth / 2,
            moreY,
            { align: 'center' }
          );
        }
      }
    }
  }

  // Borda direita final
  doc.setDrawColor(220, 220, 225);
  doc.line(
    gridLeft + 7 * colWidth,
    bodyTop,
    gridLeft + 7 * colWidth,
    bodyTop + bodyHeight
  );
}

// ============================================
// LAYOUT MENSAL — grid 7 colunas x 6 linhas
// ============================================
function drawMonthlyGrid(
  doc: jsPDF,
  itemsByDay: Map<string, CellItem[]>,
  startDate: Date,
  gridLeft: number,
  bodyTop: number,
  colWidth: number,
  bodyHeight: number
) {
  const year = startDate.getFullYear();
  const month = startDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Monta as 42 células (6 semanas x 7 dias)
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  // Dias do mês anterior
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({
      date: new Date(year, month - 1, day),
      isCurrentMonth: false,
    });
  }

  // Dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  // Próximo mês
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({
      date: new Date(year, month + 1, nextDay),
      isCurrentMonth: false,
    });
    nextDay++;
  }

  const rowHeight = bodyHeight / 6;
  const todayKey = getDayKey(new Date());

  // Desenha cada célula
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const idx = row * 7 + col;
      const cell = cells[idx];
      const x = gridLeft + col * colWidth;
      const y = bodyTop + row * rowHeight;

      const dayKey = getDayKey(cell.date);
      const isToday = dayKey === todayKey;
      const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
      const items = itemsByDay.get(dayKey) || [];

      // Fundo
      if (!cell.isCurrentMonth) {
        doc.setFillColor(248, 248, 250);
      } else if (isToday) {
        doc.setFillColor(239, 246, 255);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(x, y, colWidth, rowHeight, 'F');

      // Bordas
      doc.setDrawColor(215, 215, 220);
      doc.setLineWidth(0.15);
      doc.line(x, y, x + colWidth, y);
      doc.line(x, y, x, y + rowHeight);

      // Número do dia
      const dayNumber = cell.date.getDate();

      if (isToday) {
        // Círculo azul em volta do número
        doc.setFillColor(37, 99, 235);
        doc.circle(x + 3, y + 3, 2.4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(String(dayNumber), x + 3, y + 4, { align: 'center' });
      } else {
        doc.setTextColor(
          cell.isCurrentMonth ? (isWeekend ? 120 : 30) : 180,
          cell.isCurrentMonth ? (isWeekend ? 120 : 30) : 180,
          cell.isCurrentMonth ? (isWeekend ? 120 : 30) : 180
        );
        doc.setFontSize(7.5);
        doc.setFont('helvetica', cell.isCurrentMonth ? 'bold' : 'normal');
        doc.text(String(dayNumber), x + 1.8, y + 3.5);
      }

      // Contador de itens no canto direito
      if (cell.isCurrentMonth && items.length > 0) {
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 155);
        doc.text(String(items.length), x + colWidth - 1.5, y + 3, {
          align: 'right',
        });
      }

      // Lista de itens
      const contentStart = y + 5;
      const contentEnd = y + rowHeight - 1;
      const availableHeight = contentEnd - contentStart;
      const itemHeight = 3.3;
      const maxItems = Math.floor(availableHeight / itemHeight);

      if (cell.isCurrentMonth && items.length > 0) {
        items.slice(0, maxItems).forEach((item, i) => {
          const itemY = contentStart + i * itemHeight;

          // Barra colorida à esquerda
          const rgb = item.completed ? [180, 180, 180] : PRIORITY_RGB[item.priority];
          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.rect(x + 1, itemY + 0.2, 0.6, itemHeight - 0.8, 'F');

          // Texto: hora + título
          doc.setFontSize(5.3);
          doc.setFont('helvetica', item.completed ? 'normal' : 'bold');
          doc.setTextColor(
            item.completed ? 150 : 40,
            item.completed ? 150 : 40,
            item.completed ? 150 : 40
          );

          const prefix = item.type === 'subtask' ? '↳ ' : '';
          const timeStr = item.time + ' ';
          const text = prefix + item.title;

          const timeWidth = doc.getTextWidth(timeStr);
          const maxTitleWidth = colWidth - 3.5 - timeWidth;
          const truncated = truncateText(doc, text, maxTitleWidth);

          doc.text(timeStr + truncated, x + 2.2, itemY + 2.2);

          // Riscar se completo
          if (item.completed) {
            const fullText = timeStr + truncated;
            const textWidth = doc.getTextWidth(fullText);
            doc.setDrawColor(150, 150, 150);
            doc.setLineWidth(0.1);
            doc.line(x + 2.2, itemY + 1.9, x + 2.2 + textWidth, itemY + 1.9);
          }
        });

        // Overflow
        if (items.length > maxItems && maxItems > 0) {
          const moreY = contentStart + maxItems * itemHeight + 1.8;
          if (moreY < contentEnd) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(5);
            doc.setTextColor(120, 120, 120);
            doc.text(
              `+${items.length - maxItems} mais`,
              x + colWidth / 2,
              moreY,
              { align: 'center' }
            );
          }
        }
      }
    }
  }

  // Borda inferior
  doc.setDrawColor(215, 215, 220);
  doc.line(
    gridLeft,
    bodyTop + bodyHeight,
    gridLeft + 7 * colWidth,
    bodyTop + bodyHeight
  );
  doc.line(
    gridLeft + 7 * colWidth,
    bodyTop,
    gridLeft + 7 * colWidth,
    bodyTop + bodyHeight
  );
}