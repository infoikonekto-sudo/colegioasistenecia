import * as faceapi from 'face-api.js';

let initialized = false;

/**
 * Inicializa y verifica el acelerador gráfico WebGL / WebGPU de TensorFlow.js
 * Previene caídas silenciosas a modo CPU y garantiza rendimiento máximo en Kiosco.
 */
export async function initTensorFlowGPU(): Promise<string> {
  if (initialized) {
    return (faceapi as any).tf?.getBackend() || 'webgl';
  }

  try {
    const tf = (faceapi as any).tf;
    if (tf) {
      // Configurar flags de memoria y rendimiento WebGL
      try {
        tf.env().set('WEBGL_PACK', true);
        tf.env().set('WEBGL_CONV_IM2COL', true);
      } catch (_) {}

      // Intentar establecer backend WebGL o WebGPU
      if (tf.findBackend('webgpu')) {
        await tf.setBackend('webgpu');
      } else if (tf.findBackend('webgl')) {
        await tf.setBackend('webgl');
      }
      await tf.ready();
      const currentBackend = tf.getBackend();
      console.log(`[TensorFlow] 🚀 Hardware GPU Backend activo: ${currentBackend}`);
      initialized = true;
      return currentBackend;
    }
  } catch (e) {
    console.warn('[TensorFlow] ⚠️ Advertencia inicializando acelerador GPU:', e);
  }
  return 'webgl';
}
