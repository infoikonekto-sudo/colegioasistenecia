# 🚀 ETAPA 2: API y Flujo de Marcaje Facial

## ✅ Completado

### 1. **Endpoints de API**

#### `POST /api/empleados/actualizar-rostro`
Guardar descriptor facial de empleado después de registro.

**Request:**
```json
{
  "empleadoId": "uuid-empleado",
  "face_descriptor": [0.123, 0.456, ...],  // Float32Array como array
  "confianza_registro": 0.95,
  "muestras_capturadas": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rostro registrado exitosamente",
  "employee": { ... }
}
```

---

#### `GET /api/empleados/con-rostro`
Obtener empleados con rostro registrado (para reconocimiento en tiempo real).

**Response:**
```json
{
  "success": true,
  "count": 15,
  "employees": [
    {
      "id": "uuid",
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "face_descriptor": [0.123, 0.456, ...],
      "departamento_id": "uuid",
      "cargo_id": "uuid"
    }
  ]
}
```

---

#### `POST /api/marcajes/registrar`
Registrar marcaje de entrada/salida después de reconocimiento facial.

**Request:**
```json
{
  "empleadoId": "uuid",
  "tipo": "entrada",  // o "salida"
  "puntoDeMarcaje": "Puerta 1",
  "ipadId": "ipad-1",
  "confianza": 0.92,
  "metodoDiferenciaFacial": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Marcaje registrado exitosamente",
  "marcaje": {
    "id": "uuid",
    "empleado_id": "uuid",
    "tipo": "entrada",
    "fecha": "2024-02-08",
    "hora": "09:30:15",
    "punto_de_marcaje": "Puerta 1",
    "confianza_facial": 0.92,
    "metodo": "facial",
    "timestamp": "2024-02-08T09:30:15.000Z"
  }
}
```

---

#### `GET /api/marcajes/registrar?empleado_id=...`
Obtener último marcaje de un empleado.

**Response:**
```json
{
  "success": true,
  "lastMarcaje": {
    "id": "uuid",
    "empleado_id": "uuid",
    "tipo": "entrada",
    "fecha": "2024-02-08",
    "hora": "09:30:15",
    ...
  }
}
```

---

### 2. **Componentes Actualizados**

#### **PantallaMarcaje.tsx** - Flujo Principal
```
┌─────────────────────┐
│   CARGANDO (LS)     │  Cargar empleados con rostro
├─────────────────────┤
│   CÁMARA (LIVE)     │  Escaneo continuo de rostros
│   ├─ Face Detection │
│   ├─ Comparison     │
│   └─ Loop 500ms     │
├─────────────────────┤
│ CONFIRMACIÓN (UI)   │  Mostrar empleado + opciones
│   ├─ Entrada        │
│   └─ Salida         │
├─────────────────────┤
│ REGISTRO (API)      │  POST /api/marcajes/registrar
├─────────────────────┤
│ ÉXITO (UX)          │  Mostrar confirmación
└─────────────────────┘
```

**Estados:**
- `cargando` - Inicializando sistema
- `camara` - Escaneo activo
- `confirmacion` - Esperando confirmar tipo
- `exito` - Marcaje registrado
- `error` - Hubo error

**Features:**
- ✅ Carga empleados con rostro desde API
- ✅ Loop de reconocimiento automático (500ms)
- ✅ Pantalla de confirmación (entrada/salida)
- ✅ Registro inmediato en DB
- ✅ Lista de últimos 5 marcajes
- ✅ Reloj en tiempo real

---

### 3. **Flujo Completo de Usuario**

```
REGISTRO (Admin)
├─ Ir a: /admin/registrar-rostro?id={empleadoId}
├─ Cargar modelos de IA (3s)
├─ Capturar 3-5 muestras
├─ Generar descriptor promedio
└─ POST /api/empleados/actualizar-rostro
   └─ face_descriptor guardado en DB ✅

MARCAJE (iPad / Público)
├─ Ir a: /marcaje
├─ Cargar empleados con rostro (GET /api/empleados/con-rostro)
├─ Escaneo continuo de video
├─ Detectar rostro válido
├─ Comparar distancia euclidiana
│  └─ Si distancia < 0.6: ✅ Match
├─ Mostrar confirmación: "¿Entrada o Salida?"
├─ Usuario selecciona tipo
├─ POST /api/marcajes/registrar
│  └─ Crear registro en tabla marcajes ✅
└─ Mostrar "✅ Marcaje Registrado"
   └─ Volver a cámara (3s)
```

---

## 🎯 Características por Componente

### **CapturaRostro** ✅
```
Entrada: empleadoId, onSuccess callback
Proceso: 
  1. Cargar modelos
  2. Iniciar cámara
  3. Capturar 3-5 muestras
  4. Generar descriptor
  5. POST /api/empleados/actualizar-rostro
  6. Callback onSuccess
```

### **CamaraReconocimiento** ✅
```
Entrada: empleados[], onFaceDetected callback
Proceso:
  1. Cargar modelos
  2. Iniciar cámara
  3. Loop de detección (500ms)
  4. Comparar con todos los empleados
  5. Si match: onFaceDetected(resultado)
  6. onFaceDetected recibe:
     {
       empleadoId: uuid,
       empleado: { id, nombre, ... },
       confidence: 0.92,
       message: "Reconocido"
     }
```

### **PantallaMarcaje** ✅
```
Entrada: puntoDeMarcaje, ipadId
Proceso:
  1. GET /api/empleados/con-rostro
  2. <CamaraReconocimiento empleados={...} />
  3. Esperar resultado
  4. Mostrar <MarcajeConfirmacion />
  5. Usuario selecciona "Entrada" o "Salida"
  6. POST /api/marcajes/registrar
  7. Mostrar "✅ Éxito"
  8. Volver a paso 2
```

---

## 📊 Base de Datos

### Tabla: `empleados`
```sql
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS (
  face_descriptor JSONB,
  confianza_registro FLOAT DEFAULT 0,
  muestras_capturadas INT DEFAULT 0,
  fecha_registro_facial TIMESTAMP,
  rostro_registrado BOOLEAN DEFAULT FALSE
);
```

### Tabla: `marcajes`
```sql
CREATE TABLE marcajes (
  id UUID PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  punto_de_marcaje TEXT,
  ipad_id TEXT,
  confianza_facial FLOAT DEFAULT 0,
  metodo TEXT DEFAULT 'manual',  -- 'facial' o 'manual'
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX marcajes_empleado_id ON marcajes(empleado_id);
CREATE INDEX marcajes_fecha ON marcajes(fecha);
```

---

## 🔗 URLs de Prueba

### Registro de Rostro
```
http://localhost:3003/admin/registrar-rostro?id={empleadoId}
```

**Pasos:**
1. Obtener UUID de empleado desde `/admin/empleados`
2. Copiar ID
3. Ir a URL anterior
4. Hacer clic en "Registrar"
5. Capturar 3-5 muestras
6. ✅ Descriptor guardado en DB

### Marcaje Facial
```
http://localhost:3003/marcaje?punto=Puerta1&ipad=ipad-1
```

**Pasos:**
1. Aparecer ante cámara
2. Sistema reconoce automáticamente
3. Seleccionar "Entrada" o "Salida"
4. ✅ Marcaje registrado

---

## 🐛 Debugging

### Ver logs en consola del navegador (F12)
```javascript
// Reconocimiento facial
✅ Modelos cargados
📷 Iniciando registro
✅ Captura 1/5
📊 Empleados cargados: 15
✅ Empleado reconocido: Juan Pérez
📝 Registrando marcaje...
✅ Marcaje registrado
```

### Ver logs en servidor (terminal)
```
✅ Rostro guardado para empleado: {id}
✅ Empleados con rostro recuperados: 15
✅ Marcaje registrado: {id} - entrada
```

---

## 🚀 Próxima Etapa: Testing Completo

### Checklist:
- [ ] Registrar rostro de 3-5 empleados
- [ ] Validar `face_descriptor` en DB (JSONB válido)
- [ ] Probar reconocimiento en `/marcaje`
- [ ] Validar marcajes creados en tabla `marcajes`
- [ ] Probar en móvil (Samsung S23+)
- [ ] Validar performance (loop 500ms)
- [ ] Probar múltiples intentos fallidos
- [ ] Probar cambio de entrada a salida

---

## 📋 Configuración Necesaria

### Variables de Entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Permisos en Supabase RLS
```sql
-- Empleados (lectura pública para rostro)
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_rostro" ON empleados
  FOR SELECT USING (rostro_registrado = true);

-- Marcajes (inserción autenticada)
ALTER TABLE marcajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_marcaje" ON marcajes
  FOR INSERT WITH CHECK (true);
```

---

**Estado**: ✅ APIS FUNCIONALES Y LISTAS PARA TESTING
**Última actualización**: 2024-02-08
**Próximo paso**: Testing end-to-end en móvil
