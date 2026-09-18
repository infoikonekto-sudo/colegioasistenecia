import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarValeEntrega = async (movimiento: any, sede: string, firmaBase64?: string) => {

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  // Colores corporativos
  const COLOR_PRIMARIO: [number, number, number] = sede === 'ROOS' ? [15, 23, 42] : [6, 78, 59]; // Navy o Emerald
  
  // Encabezado
  doc.setFillColor(COLOR_PRIMARIO[0], COLOR_PRIMARIO[1], COLOR_PRIMARIO[2]);
  doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`COLEGIO MANOS A LA OBRA - SEDE ${sede}`, 15, 18);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('VALE DE ENTREGA DE INVENTARIO / PRENDAS', 15, 26);

  // Información del Documento
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  const fecha = new Date(movimiento.fecha).toLocaleString('es-ES');
  const empleado = movimiento.empleado 
    ? `${movimiento.empleado.nombre} ${movimiento.empleado.apellido}` 
    : 'No asignado';
  const cargo = movimiento.empleado?.cargo || movimiento.departamento || 'No especificado';

  let yPos = 45;
  doc.text('Datos de la Entrega:', 15, yPos);
  
  doc.setFont('helvetica', 'normal');
  yPos += 8;
  doc.text(`Fecha y Hora: ${fecha}`, 15, yPos);
  yPos += 8;
  doc.text(`Entregado a: ${empleado}`, 15, yPos);
  yPos += 8;
  doc.text(`Cargo / Área: ${cargo}`, 15, yPos);

  // Tabla de artículos
  yPos += 15;
  const item = movimiento.item;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Cantidad', 'Descripción del Artículo', 'Categoría', 'Talla/Medida', 'Área / Género']],
    body: [
      [
        movimiento.cantidad.toString(),
        item?.nombre || 'Ítem Eliminado',
        item?.categoria || 'N/A',
        item?.talla_o_medida || 'N/A',
        `${item?.area_asignada || 'General'} / ${item?.genero || 'N/A'}`
      ]
    ],
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: COLOR_PRIMARIO, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Notas
  yPos = (doc as any).lastAutoTable.finalY + 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Observaciones:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 6;
  
  const notasLines = doc.splitTextToSize(movimiento.notas || 'Sin observaciones', 180);
  doc.text(notasLines, 15, yPos);
  
  yPos += notasLines.length * 6 + 30;

  // Firmas
  if (yPos > 240) {
    doc.addPage();
    yPos = 40;
  }

  doc.setLineWidth(0.5);
  // Linea Firma Entrega
  doc.line(20, yPos, 90, yPos);
  // Linea Firma Recibe
  doc.line(120, yPos, 190, yPos);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Entregado por (Administración)', 30, yPos + 6);
  doc.text('Firma de Aceptación y Cargo', 135, yPos + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const employeeTextWidth = doc.getTextWidth(empleado);
  const employeeX = 120 + ((70 - employeeTextWidth) / 2);
  doc.text(empleado, employeeX, yPos + 12);

  // Renderizar la firma si existe
  if (firmaBase64) {
    try {
      // Ajustamos la firma justo arriba de la línea
      doc.addImage(firmaBase64, 'PNG', 125, yPos - 15, 60, 15);
    } catch (error) {
      console.error('Error al incrustar la firma:', error);
    }
  }

  // Pie de página
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    'Este documento hace constar la entrega oficial de artículos propiedad del Colegio. ' +
    'El empleado asume la responsabilidad del buen uso y cuidado de los mismos.',
    15, 270, { maxWidth: 180 }
  );

  doc.save(`Vale_Entrega_${empleado.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
};
