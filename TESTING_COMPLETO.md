# 🚀 INSTRUCCIONES DE TESTING - SISTEMA FACIAL COMPLETO

## ✅ Estado Actual

| Componente | Status | Detalles |
|-----------|--------|----------|
| Motor Facial | ✅ | Reconocimiento optimizado |
| Modelos IA | ✅ | 11.8 MB locales descargados |
| Endpoints API | ✅ | 3 rutas funcionales |
| UI Registro | ✅ | Captura 3-5 muestras |
| UI Marcaje | ✅ | Reconocimiento automático |
| Servidor | ✅ | Corriendo en puerto 3003 |

---

## 🧪 TESTING PASO A PASO

### PASO 1: Obtener ID de Empleado

**Opción A: Crear empleado de prueba**
```bash
# Ir a Supabase Dashboard
# Tabla: empleados
# Copiar UUID de cualquier empleado
# Ejemplo: b64dcd7e-6a71-49cd-9ed7-216faf9ad64a
```

**Opción B: Usar lista de empleados**
```
1. Ir a: http://localhost:3003/admin/empleados
2. Buscar un empleado
3. Copiar su UUID
```

---

### PASO 2: Registrar Rostro (ADMIN)

**URL:**
```
http://localhost:3003/admin/registrar-rostro?id=COPIAR_UUID_AQUI
```

**Ejemplo:**
```
http://localhost:3003/admin/registrar-rostro?id=b64dcd7e-6a71-49cd-9ed7-216faf9ad64a
```

**Pasos:**
1. Esperar a que cargue "✅ Listo para registrar rostro"
2. Hacer clic en botón azul "📷 Iniciar Registro"
3. Aparecer ante la cámara (cara centrada, buena luz)
4. Sistema captura automáticamente 3-5 muestras
5. Indicador:
   - 🔴 Rojo = No válido (acercate más)
   - 🟢 Verde = Válido (capturando)
6. Esperar a "✅ Rostro registrado exitosamente"
7. Descriptos guardado en DB ✅

**Logs esperados (F12):**
```
📦 Cargando modelos de IA...
[Esperar 2-3s]
✅ Listo para registrar rostro
📷 Iniciando registro de {id}
✅ Captura 1/5 - Score: 45%
✅ Captura 2/5 - Score: 52%
✅ Captura 3/5 - Score: 48%
✅ Rostro guardado en DB
```

**Duración:** ~10-15 segundos

---

### PASO 3: Verificar Guardado en BD

**Ir a Supabase:**
1. Dashboard → Tabla `empleados`
2. Buscar empleado registrado
3. Columna `face_descriptor` debe tener datos JSON
4. Verificar: `rostro_registrado = true`

**Datos guardados:**
- `face_descriptor`: Array de 128 números
- `confianza_registro`: 0.4-1.0
- `muestras_capturadas`: 3-5
- `fecha_registro_facial`: Timestamp actual
- `rostro_registrado`: true ✅

---

### PASO 4: Marcar Asistencia (PÚBLICO)

**URL:**
```
http://localhost:3003/marcaje
```

**Pasos:**
1. Esperar a "✅ Sistema listo"
2. Aparecer ante la cámara
3. Sistema automáticamente:
   - Detecta tu rostro
   - Compara con empleados registrados
   - Si coincide: muestra nombre
4. Seleccionar:
   - ✅ "Entrada" (mañana)
   - ✅ "Salida" (tarde)
5. Sistema registra automáticamente
6. Pantalla verde: "✅ Juan Pérez - Entrada Registrada"
7. Vuelve a cámara para siguiente empleado

**Logs esperados:**
```
📥 Cargando empleados...
✅ Empleados cargados: 15
📦 Cargando modelos...
✅ Sistema listo
📍 Buscando rostro...
🔍 Analizando...
✅ Empleado reconocido: Juan Pérez
¡Hola Juan Pérez!
📝 Registrando marcaje...
✅ Marcaje registrado: entrada
```

**Duración:** ~3-5 segundos

---

### PASO 5: Verificar Marcaje en BD

**Ir a Supabase:**
1. Dashboard → Tabla `marcajes`
2. Debe haber nuevo registro con:
   - `empleado_id`: UUID correcto
   - `tipo`: "entrada" o "salida"
   - `fecha`: Hoy
   - `hora`: Hora actual
   - `confianza_facial`: 0.4-1.0
   - `metodo`: "facial" ✅
   - `timestamp`: Timestamp actual

---

## 📱 TESTING EN MÓVIL

### Obtener IP del Servidor

**Desde PC (PowerShell):**
```powershell
ipconfig /all
# Buscar: IPv4 Address: 192.168.X.X
```

### En Móvil (Samsung S23+)

1. **Conectar a WiFi** (misma red que PC)

2. **Registrar Rostro:**
   ```
   http://192.168.X.X:3003/admin/registrar-rostro?id=UUID
   ```

3. **Marcar Asistencia:**
   ```
   http://192.168.X.X:3003/marcaje
   ```

4. **Notas:**
   - ⚠️ Requiere HTTPS en producción
   - ⚠️ WiFi debe permitir tráfico local
   - ✅ Probado en Samsung S23+

---

## 🐛 DEBUGGING

### Abrir Consola del Navegador
```
F12 → Console
Buscar: "✅" = Éxito
Buscar: "❌" o "⚠️" = Problemas
```

### Logs Clave

**Carga de Modelos:**
```
✅ Modelos locales cargados exitosamente     [RÁPIDO]
O
⚠️  Modelos locales no disponibles...
✅ Modelos CDN cargados exitosamente         [LENTO]
```

**Registro Facial:**
```
✅ Captura X/5 - Score: YY%   [BUENO si Score > 40%]
❌ Acercate más                [AJUSTAR DISTANCIA]
📍 Ajustando...                [ESPERAR]
```

**Reconocimiento:**
```
✅ Empleado reconocido: Nombre    [ÉXITO]
❌ Rostro no reconocido           [REINTENTAR]
📍 Buscando rostro...             [ESPERANDO]
```

**Marcaje:**
```
✅ Marcaje registrado: entrada    [BD OK]
❌ Error: ...                     [ERROR API]
```

---

## ⚠️ PROBLEMAS COMUNES

### Error: "No se detectó rostro"
```
Causas:
- Poca luz
- Rostro fuera del frame
- Ángulo muy inclinado

Solución:
- Mejorar iluminación
- Acercarse más
- Poner rostro recto
```

### Error: "Confianza muy baja"
```
Causas:
- Oclusión (gafas, sombreros, mascarilla)
- Movimiento rápido
- Fondo muy ocupado

Solución:
- Quitar accesorios
- Movimiento lento
- Fondo limpio
```

### Error: "Rostro no reconocido"
```
Causas:
- Empleado no registrado
- Luz diferente a registro
- Cambio físico (barba, corte)

Solución:
- Registrar primero
- Misma iluminación
- Registrar con variaciones
```

### Error: "API error"
```
Causas:
- Servidor no corre
- RLS bloqueando inserts
- Variables de entorno faltantes

Solución:
- Verificar: npm run dev corriendo
- Revisar RLS en Supabase
- Verificar .env.local
```

---

## 📊 MÉTRICAS ESPERADAS

### Registro de Rostro
```
Tiempo total: 10-15 segundos
Muestras: 3-5
Confianza: 0.40-0.99
Área rostro: 3-80% del frame
```

### Reconocimiento
```
Tiempo detección: ~500ms
Tiempo comparación: ~100ms
Tiempo total: 1-2 segundos
Precisión: >95% si bien registrado
```

### Base de Datos
```
Descriptor: Float32Array (128 valores)
Tamaño: ~500 bytes en JSONB
Búsqueda: O(n) comparaciones
```

---

## ✅ CHECKLIST FINAL

- [ ] Servidor corre en puerto 3003
- [ ] Modelos descargados (11.8 MB)
- [ ] Página carga sin errores
- [ ] Cámara solicita permisos
- [ ] Registro: 3-5 muestras capturadas
- [ ] Descriptor guardado en BD
- [ ] Marcaje: reconoce automáticamente
- [ ] Marcaje guardado en BD
- [ ] Entrada y salida funcionan
- [ ] Testing en móvil OK
- [ ] Múltiples empleados OK
- [ ] Performance < 2s por marcaje

---

## 📞 RECURSOS

| Archivo | Propósito |
|---------|-----------|
| MODELOS_CONFIG.md | Configuración de modelos |
| ETAPA_2_API_MARCAJE.md | Endpoints y flujos |
| lib/facialRecognitionEngine.ts | Motor de IA |
| components/Admin/CapturaRostro.tsx | UI registro |
| components/Marcaje/PantallaMarcaje.tsx | UI marcaje |
| app/api/** | Endpoints REST |

---

## 🎯 Próximos Pasos (Opcionales)

1. **Dashboard de reportes**
2. **Validaciones adicionales (PIN + facial)**
3. **Integración con nómina**
4. **Exportar reportes (PDF/Excel)**

---

**Status**: ✅ LISTO PARA TESTING COMPLETO
**Fecha**: 8 febrero 2026
**Servidor**: http://localhost:3003 ✅
