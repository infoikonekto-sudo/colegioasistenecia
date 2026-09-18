import QRCode from 'qrcode';

/**
 * Genera un código QR único inalterable para un empleado.
 * Formato: EMPL-XXXXXX (ej: EMPL-A1B2C3)
 */
export function generarCodigoQR(): string {
  const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `EMPL-${randomHex}`;
}

/**
 * Valida si un string cumple con el formato válido de código QR de empleado o cédula.
 */
export function esCodigoQRValido(codigo: string): boolean {
  if (!codigo || typeof codigo !== 'string') return false;
  const trimmed = codigo.trim();
  // Formato oficial EMPL-XXXXXX o Cédula numérica (10-15 dígitos)
  return /^EMPL-[A-Z0-9]{4,10}$/i.test(trimmed) || /^\d{4,15}$/.test(trimmed);
}

/**
 * Decodifica y clasifica la data leída por el escáner.
 */
export function decodificarQRData(codigo: string) {
  if (!codigo || typeof codigo !== 'string') return { valido: false, tipo: 'invalido', codigo: '' };
  
  const trimmed = codigo.trim();
  
  if (/^EMPL-[A-Z0-9]{4,10}$/i.test(trimmed)) {
    return { valido: true, tipo: 'qr_oficial', codigo: trimmed.toUpperCase() };
  }
  
  if (/^\d{4,15}$/.test(trimmed)) {
    return { valido: true, tipo: 'cedula', codigo: trimmed };
  }
  
  return { valido: false, tipo: 'desconocido', codigo: trimmed };
}

/**
 * Genera la representación DataURL (base64 PNG) del código QR para renderizar o descargar.
 */
export async function generarImagenQRDataUrl(codigo: string, darkColor: string = '#1E3A8A'): Promise<string> {
  try {
    const textoCodigo = codigo || generarCodigoQR();
    return await QRCode.toDataURL(textoCodigo, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: {
        dark: darkColor, // Color institucional Navy
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Error generando DataURL del código QR:', err);
    // SVG Fallback Data URL en caso de error
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f8fafc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#64748b">QR: ${codigo}</text></svg>`;
    return `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa(svgString) : ''}`;
  }
}

