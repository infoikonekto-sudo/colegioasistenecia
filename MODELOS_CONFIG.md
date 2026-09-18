# 📦 Directorio de Modelos - Configuración

## ✅ Estado Actual

```
/public/models/
├─ ssd_mobilenetv1_model.bin       (5.4 MB)  ✅
├─ ssd_mobilenetv1_model.json      (91 B)    ✅
├─ face_landmark_68_model.bin      (348 KB)  ✅
├─ face_landmark_68_model.json     (92 B)    ✅
├─ face_recognition_model.bin      (6.1 MB)  ✅
└─ face_recognition_model.json     (92 B)    ✅

Total: ~11.8 MB descargados ✅
```

**Descargado:** 8 de febrero de 2026
**Fuente:** jsdelivr CDN (@vladmandic/face-api)

---

## 🔄 Estrategia de Carga

El motor ahora intenta **automáticamente**:

```typescript
1. PRIMERO: Modelos locales (/public/models/)
   ├─ Más rápido (no requiere red)
   ├─ Mejor para producción
   └─ ~2-3 segundos en primera carga

2. SI FALLA: CDN (jsdelivr)
   ├─ Fallback automático
   ├─ Requiere conexión a internet
   └─ Respaldo confiable
```

### Ventajas de Modelos Locales

| Aspecto | Local | CDN |
|---------|-------|-----|
| Velocidad | ⚡⚡ Muy rápida | ⚡ Rápida |
| Primera carga | ~2s | ~3-5s |
| Carga posterior | ~1s | ~1-2s |
| Offline | ✅ Funciona | ❌ No |
| Confiabilidad | ✅ 100% | ⚠️ Dependencia |
| Tamaño | +11.8 MB | 0 MB |

---

## 🧪 Verificación

### Comprobar qué se está usando

Abre DevTools (F12) en la página de registro:

```javascript
// En consola del navegador:
📦 Intentando cargar modelos locales...
✅ Modelos locales cargados exitosamente
```

O si usa CDN:

```javascript
⚠️  Modelos locales no disponibles, usando CDN...
📦 Cargando modelos desde CDN...
✅ Modelos CDN cargados exitosamente
```

### Probar carga local vs CDN

```bash
# Opción 1: Usar modelos locales (automático)
npm run dev
# Ir a /admin/registrar-rostro

# Opción 2: Forzar CDN (comentar línea 58 en facialRecognitionEngine.ts)
```

---

## 📝 Archivos de Modelo

### SSD MobileNet v1
- **Función:** Detectar rostros en imagen/video
- **Datos:**
  - `ssd_mobilenetv1_model.json` - Arquitectura (91 B)
  - `ssd_mobilenetv1_model.bin` - Pesos (5.4 MB)

### Face Landmark 68
- **Función:** Detectar puntos faciales (ojos, nariz, boca, etc.)
- **Datos:**
  - `face_landmark_68_model.json` - Arquitectura (92 B)
  - `face_landmark_68_model.bin` - Pesos (348 KB)

### Face Recognition Net
- **Función:** Generar descriptor facial (vector 128D)
- **Datos:**
  - `face_recognition_model.json` - Arquitectura (92 B)
  - `face_recognition_model.bin` - Pesos (6.1 MB)

---

## 🔧 Cambiar Estrategia de Carga

### Para forzar SOLO modelos locales:

```typescript
// lib/facialRecognitionEngine.ts - línea 55

async loadModels(): Promise<void> {
  if (this.modelsLoaded) return

  const LOCAL_URL = '/models/'
  
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(LOCAL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(LOCAL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(LOCAL_URL),
    ])
    this.modelsLoaded = true
    console.log('✅ Modelos locales cargados')
  } catch (error) {
    throw new Error('Modelos no disponibles')
  }
}
```

### Para forzar SOLO CDN:

```typescript
// Comentar bloque de LOCAL_URL y usar directamente:

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'

await Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri(CDN_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(CDN_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL),
])
```

---

## 🚀 Performance

### Con Modelos Locales
```
1ª carga: ~2-3s (descarga en memoria)
2ª+ carga: ~1s (cache en memoria)
Detección: ~500ms por frame
Total registro 5 muestras: ~10-15s
```

### Con CDN
```
1ª carga: ~3-5s (red + parse)
2ª+ carga: ~1-2s (cache del navegador)
Detección: ~500ms por frame
Total registro 5 muestras: ~12-20s
```

---

## 📱 Recomendaciones

### Para Desarrollo Local
✅ **Usar modelos locales**
- Más rápido (sin latencia de red)
- Funciona offline
- Mejor debugging

### Para Producción
✅ **Automático (local → CDN)**
- Fallback inteligente
- No requiere descargas previas
- Usa lo que esté disponible

### Para Móvil/iPad
⚠️ **Considerar:**
- Si conexión es confiable → CDN es OK
- Si offline frecuente → usar locales
- Modelos (~12 MB) pueden ser pesados en móvil

---

## 🔐 Seguridad

### Los modelos son PUBLIC
- Archivos en `/public/models/`
- Descargables por cualquiera
- Son datos de entrenamiento (no sensibles)
- ✅ Seguro publicar

### Alternativa: CDN
- Más seguro en desarrollo
- No añade pesos al bundle
- Mantenimiento centralizado

---

## 🆘 Troubleshooting

### Error: "Modelos no encontrados"
```
Solución:
1. Ejecutar: node scripts/download-models.js
2. Verificar: /public/models/ contiene 6 archivos
3. Reiniciar: npm run dev
```

### Error: "Red error en CDN"
```
Solución:
1. Verificar conexión a internet
2. Los modelos locales deberían funcionar
3. Si falla: ejecutar node scripts/download-models.js
```

### Modelos lentos en móvil
```
Solución:
1. Usar CDN (menos tráfico local)
2. O: comprimir modelos
3. O: usar servidor local en red
```

---

## 📊 Tamaño Final

```
Desarrollo: +11.8 MB en /public
Producción: 
  - Con locales: +11.8 MB en build
  - Sin locales: +0 MB en build (CDN)

Recomendado: Mantener locales (11.8 MB es aceptable)
```

---

**Status**: ✅ MODELOS DESCARGADOS Y CONFIGURADOS
**Última actualización**: 8 de febrero de 2026
**Estrategia**: Automática (local → CDN)
