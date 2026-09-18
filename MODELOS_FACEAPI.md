# 📦 Configuración de Modelos Face-API

Para que el sistema de reconocimiento facial funcione, necesita los modelos de TensorFlow.js en la carpeta `/public/models`.

## Opción 1: Descargar automáticamente (Recomendado)

Ejecuta este comando desde la carpeta del proyecto:

```bash
npm run setup-models
```

Este script descargará automáticamente los 3 modelos necesarios.

## Opción 2: Descargar manualmente

### Crear la carpeta

```bash
mkdir -p public/models
```

### Descargar los modelos

Los modelos están disponibles públicamente. Necesitas estos 3 archivos:

1. **SSD MobileNet v1**
   - `public/models/ssd_mobilenetv1_model.json`
   - `public/models/ssd_mobilenetv1_model.bin`

2. **Face Landmark 68**
   - `public/models/face_landmark_68_model.json`
   - `public/models/face_landmark_68_model.bin`

3. **Face Recognition**
   - `public/models/face_recognition_model.json`
   - `public/models/face_recognition_model.bin`

### Descargar desde CDN

Usa estos links para descargar:

```
SSD MobileNet:
https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/ssd_mobilenetv1_model.json
https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/ssd_mobilenetv1_model.bin

Face Landmark 68:
https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_landmark_68_model.json
https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_landmark_68_model.bin

Face Recognition:
https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model.json
https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model.bin
```

1. Abre cada URL en el navegador
2. Descarga cada archivo (.json y .bin)
3. Copia los archivos a la carpeta `public/models/`

## Opción 3: Usar CDN en lugar de archivos locales (Más simple)

Modifica `lib/faceRecognition.ts`:

```typescript
// Cambiar:
const MODEL_URL = '/models';

// Por:
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
```

**Ventajas**: No necesitas descargar archivos
**Desventajas**: Requiere conexión a internet

## Verificar que los modelos están correctos

1. Abre la consola del navegador (F12)
2. Vuelve a cargar la página
3. Debería ver:
   - ✅ "Modelos cargados correctamente"
   - ✅ La cámara se activa
   - ✅ Sin errores en la consola

## Errores comunes

### "Module not found: Can't resolve 'fs'"
- ✗ Face-api.js intenta usar módulos Node.js
- ✓ Solución: Ya está arreglado en el código

### "Failed to load resource: net::ERR_NAME_NOT_RESOLVED"
- ✗ Los modelos no están en `/public/models` o no carga desde CDN
- ✓ Solución: Verificar que los archivos existen en la carpeta correcta

### Cámara no se activa
- ✗ Modelos aún están cargando (tarda 10-20 segundos la primera vez)
- ✓ Esperar y revisar la consola para errores

## Tamaño de los modelos

- SSD MobileNet: ~100 KB + ~5 MB
- Face Landmark 68: ~100 KB + ~350 KB  
- Face Recognition: ~100 KB + ~130 KB

**Total**: ~6 MB (se cachean en el navegador después de la primera carga)

## Caching

Los modelos se cachean en:
- IndexedDB del navegador (automático)
- LocalStorage de face-api.js

**Nota**: Los navegadores iPad también cachean, así que la segunda vez que abres la app, carga casi instantáneamente.
