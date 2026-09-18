# 📖 Guía Completa de Instalación
## Sistema de Asistencia Biométrica - Colegio Manos a la Obra

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Paso 1: Configurar Supabase](#paso-1-configurar-supabase)
3. [Paso 2: Configurar Código Localmente](#paso-2-configurar-código-localmente)
4. [Paso 3: Desplegar a Producción](#paso-3-desplegar-a-producción)
5. [Paso 4: Configurar iPads](#paso-4-configurar-ipads)
6. [Paso 5: Registrar Personal](#paso-5-registrar-personal)
7. [Paso 6: Configurar Dashboard RRHH](#paso-6-configurar-dashboard-rrhh)
8. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Requisitos Previos

### Hardware
- ✅ 4 iPads (8va generación o superior)
- ✅ 4 soportes ajustables
- ✅ Conexión WiFi estable
- ✅ Computadora para configuración

### Software & Cuentas
- ✅ Node.js 18+ instalado
- ✅ Git instalado
- ✅ Cuenta de Supabase (gratuita)
- ✅ Cuenta de Vercel (gratuita)
- ✅ Cuenta de GitHub (gratuita)

---

## 🗂️ PASO 1: Configurar Supabase

### 1.1 Crear Proyecto en Supabase

```
1. Ve a https://supabase.com
2. Haz clic en "Start your project"
3. Inicia sesión con GitHub
4. Crea una nueva organización:
   - Nombre: "Colegio Manos a la Obra"
5. Crea un nuevo proyecto:
   - Name: colegio-asistencia
   - Database Password: [guarda esto en un lugar seguro]
   - Region: South America (São Paulo) [o la más cercana]
   - Pricing Plan: Free
6. Espera 2-3 minutos para que se cree el proyecto
```

### 1.2 Ejecutar Script SQL

```
1. En el panel de Supabase, ve a SQL Editor (menú lateral)
2. Haz clic en "New query"
3. Abre el archivo: supabase_schema.sql
4. Copia TODO el contenido
5. Pega en el editor de Supabase
6. Haz clic en "Run" (o Ctrl+Enter)
7. Verifica que aparezca "Success. No rows returned"
```

### 1.3 Obtener Credenciales

```
1. Ve a Settings → API (menú lateral)
2. Copia y guarda estos valores en un lugar seguro:
   - Project URL: https://xxxxx.supabase.co
   - anon public key: eyJhbGc...

3. IMPORTANTE: Nunca compartas estas credenciales públicamente
```

### 1.4 Crear Buckets de Storage

```
1. Ve a Storage (menú lateral)
2. Haz clic en "Create a new bucket"
3. PRIMER BUCKET:
   - Name: empleados-fotos
   - Public bucket: ✅ ACTIVADO
   - Clic en "Create bucket"

4. SEGUNDO BUCKET:
   - Name: marcajes-fotos
   - Public bucket: ✅ ACTIVADO
   - Clic en "Create bucket"
```

### 1.5 Crear Usuario Administrativo

```
1. Ve a Authentication → Users
2. Haz clic en "Add user"
3. Email: admin@colegiomanosalaobra.com
4. Password: [contraseña segura de 12+ caracteres]
5. Toggle "Auto Confirm User" → ACTIVADO
6. Clic en "Create user"
```

---

## 💻 PASO 2: Configurar Código Localmente

### 2.1 Clonar o Descargar Proyecto

**Opción A: Con Git**
```bash
git clone https://github.com/tu-usuario/colegio-asistencia.git
cd colegio-asistencia
```

**Opción B: Descarga Manual**
```
1. Descarga el archivo ZIP del proyecto
2. Descomprime en tu carpeta deseada
3. Abre terminal en esa carpeta
```

### 2.2 Instalar Dependencias

```bash
npm install
```

Esto instalará:
- Next.js 14
- React 18
- Tailwind CSS
- face-api.js
- Supabase Client
- Y todas las librerías necesarias

### 2.3 Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env.local
```

Edita `.env.local` con tus datos:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Aplicación
NEXT_PUBLIC_APP_NAME="Colegio Manos a la Obra"
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Reconocimiento Facial
NEXT_PUBLIC_FACE_RECOGNITION_THRESHOLD=0.6

# Puntos de Marcaje (iPads)
NEXT_PUBLIC_IPAD_1_NAME="Puerta 1"
NEXT_PUBLIC_IPAD_2_NAME="Puerta 2"
NEXT_PUBLIC_IPAD_3_NAME="Puerta 3"
NEXT_PUBLIC_IPAD_4_NAME="Oficina"
```

### 2.4 Descargar Modelos de Reconocimiento Facial

Necesitas descargar los modelos de face-api.js:

```bash
# Crea la carpeta si no existe
mkdir -p public/models

# Descarga los modelos desde:
# https://github.com/justadudewhohacks/face-api.js/tree/master/weights
```

**Archivos necesarios:**
```
public/models/
├── ssd_mobilenetv1_model-weights_manifest.json
├── ssd_mobilenetv1_model-shard1
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_recognition_model-weights_manifest.json
├── face_recognition_model-shard1
└── face_recognition_model-shard2
```

**Opción alternativa (descargar con script):**
```bash
# Si tienes curl disponible:
curl -o public/models/ssd_mobilenetv1_model-weights_manifest.json https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/ssd_mobilenetv1_model-weights_manifest.json
# ... repetir para cada archivo
```

### 2.5 Probar Localmente

```bash
npm run dev
```

Abre tu navegador en: `http://localhost:3000`

**Deberías ver:**
- La pantalla de marcaje en `/marcaje`
- El dashboard en `/admin` (con login)

**Si hay errores:**
- Verifica variables de entorno en `.env.local`
- Confirma que Supabase está activo
- Revisa la consola del navegador (F12) para errores

---

## 🚀 PASO 3: Desplegar a Producción

### 3.1 Subir Código a GitHub

```bash
# Inicializar git (si no lo has hecho)
git init
git add .
git commit -m "Sistema de asistencia inicial"
git branch -M main

# Crear repositorio en GitHub y subir
git remote add origin https://github.com/TU-USUARIO/colegio-asistencia.git
git push -u origin main
```

### 3.2 Desplegar en Vercel

```
1. Ve a https://vercel.com
2. Inicia sesión con GitHub
3. Haz clic en "Add New..." → "Project"
4. Busca "colegio-asistencia"
5. Selecciona el repositorio
6. Configuración:
   - Framework: Next.js
   - Root Directory: ./
7. Variables de entorno:
   - NEXT_PUBLIC_SUPABASE_URL=...
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   - (Todas las demás del .env.local)
8. Haz clic en "Deploy"
9. Espera 2-3 minutos
```

**Tu URL será:** `https://colegio-asistencia.vercel.app`

---

## 📱 PASO 4: Configurar iPads

### 4.1 Preparar Cada iPad

Para cada uno de los 4 iPads:

```
1. Actualizar iOS:
   - Ajustes → General → Actualización de software
   - Instalar última versión disponible

2. Conectar a WiFi:
   - Ajustes → WiFi
   - Seleccionar red "COLEGIO" o la de tu institución

3. Pantalla:
   - Ajustes → Pantalla y brillo
   - Brillo: MÁXIMO
   - Bloqueo automático: NUNCA

4. Datos de Móvil (opcional):
   - Si tienes plan de datos
   - Ajustes → Datos móviles → ACTIVADO
```

### 4.2 Instalar Aplicación en Home

**Para CADA iPad**, sigue estos pasos:

```
1. Abre Safari
2. Escribe en la barra de direcciones:
   https://colegio-asistencia.vercel.app/marcaje?punto=PUNTO&ipad=IPAD_ID
   
   REEMPLAZA:
   - PUNTO: "Puerta 1", "Puerta 2", "Puerta 3", u "Oficina"
   - IPAD_ID: "ipad-1", "ipad-2", "ipad-3", o "ipad-4"

EJEMPLOS:
   iPad 1 (Puerta 1):
   https://colegio-asistencia.vercel.app/marcaje?punto=Puerta%201&ipad=ipad-1
   
   iPad 2 (Puerta 2):
   https://colegio-asistencia.vercel.app/marcaje?punto=Puerta%202&ipad=ipad-2
   
   iPad 3 (Puerta 3):
   https://colegio-asistencia.vercel.app/marcaje?punto=Puerta%203&ipad=ipad-3
   
   iPad 4 (Oficina):
   https://colegio-asistencia.vercel.app/marcaje?punto=Oficina&ipad=ipad-4

3. La página debe cargar completamente
4. Haz clic en el botón "Compartir" (cuadrado con flecha)
5. Selecciona "Añadir a pantalla de inicio"
6. Dale un nombre: "Asistencia - [PUNTO]"
7. Haz clic en "Añadir"
8. Ahora verás un ícono en el Home
9. Haz clic en el ícono para probar que funciona
```

### 4.3 Bloquear iPad con Acceso Guiado

Para evitar que salgan de la app:

```
1. Ajustes → Accesibilidad
2. Desplázate a "Acceso Guiado"
3. Activa "Acceso Guiado"
4. Configura un código de acceso (4 dígitos)
5. Abre la app de Asistencia
6. Presiona 3 veces el botón de inicio (o lateral)
7. Configura restricciones:
   - Toques multitouch: Activado
   - Opciones del dispositivo: Desactivado
8. Haz clic en "Iniciar"
9. El iPad quedará bloqueado en la app

PARA SALIR (necesario para actualizaciones):
- Presiona 3 veces el botón de inicio/lateral
- Ingresa el código de acceso
```

### 4.4 Instalar Soportes

```
- Altura recomendada: 1.50m - 1.70m del suelo
- Ángulo: Ligeramente hacia abajo (15°)
- Iluminación: Buena luz frontal, SIN contraluz
- Protección: Funda o protector transparente
```

---

## 👥 PASO 5: Registrar Personal

### 5.1 Agregar Empleados en Supabase

**Opción A: Manual (para pocos)**

```
1. Ve a Supabase → Table Editor
2. Selecciona tabla "empleados"
3. Haz clic en "Insert row"
4. Completa los campos:
   - nombre: Juan
   - apellido: Pérez
   - cedula: 1700123456 (único)
   - departamento: Docentes
   - cargo: Profesor de Matemáticas
   - horario_entrada: 08:00:00
   - tolerancia_minutos: 15
   - activo: true
5. Haz clic en "Save"
```

**Opción B: Importar desde Excel (recomendado)**

```
1. Prepara un archivo Excel con:
   nombre,apellido,cedula,departamento,cargo,email,telefono
   Juan,Pérez,1700123456,Docentes,Profesor,juan@email.com,0987654321
   María,López,1700123457,Administrativo,Secretaria,maria@email.com,0987654322

2. Guárdalo como CSV

3. Ve a Supabase → Table Editor → empleados

4. Haz clic en "Import data" (si no ves, usa este método SQL):

5. O ejecuta este SQL:
   INSERT INTO empleados (nombre, apellido, cedula, departamento, cargo, email)
   VALUES
   ('Juan', 'Pérez', '1700123456', 'Docentes', 'Profesor', 'juan@email.com'),
   ('María', 'López', '1700123457', 'Administrativo', 'Secretaria', 'maria@email.com');
```

### 5.2 Capturar Rostros

Para cada empleado, necesitas capturar su rostro:

**Método 1: Interfaz de Registro (recomendado para fase 2)**
- Crear una página especial de registro
- El sistema automáticamente genera el descriptor facial

**Método 2: Manual (para now)**

```bash
# Necesitas fotos de 3-5 ángulos diferentes
# Crea carpeta: fotos_empleados/

# Luego ejecuta un script Node.js para procesar:
node scripts/registrar-rostros.js

# Script ejemplo (crear en /scripts/registrar-rostros.js):
const fs = require('fs');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const { supabase } = require('../lib/supabase');

async function registrarRostro(empleadoId, fotoPath) {
  // Cargar imagen
  const img = await canvas.loadImage(fotoPath);
  
  // Detectar rostro
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  if (!detection) {
    console.error(\`No se detectó rostro en \${fotoPath}\`);
    return;
  }
  
  // Guardar descriptor
  const descriptor = Array.from(detection.descriptor);
  
  const { error } = await supabase
    .from('empleados')
    .update({ face_descriptor: descriptor })
    .eq('id', empleadoId);
  
  if (error) {
    console.error('Error guardando descriptor:', error);
  } else {
    console.log(\`Rostro registrado para \${empleadoId}\`);
  }
}
```

---

## 🖥️ PASO 6: Configurar Dashboard RRHH

### 6.1 Crear Usuarios Administrativos

```sql
-- En Supabase SQL Editor, ejecuta:
INSERT INTO usuarios_admin (email, nombre, rol, departamento, activo)
VALUES
('rrhh@colegiomanosalaobra.com', 'Coordinador RRHH', 'rrhh', 'Recursos Humanos', true),
('director@colegiomanosalaobra.com', 'Director', 'super_admin', 'Dirección', true);
```

### 6.2 Acceder al Dashboard

```
1. Ve a: https://colegio-asistencia.vercel.app/admin
2. Inicia sesión con:
   Email: admin@colegiomanosalaobra.com
   Password: [la que configuraste en paso 1.5]

3. Deberías ver:
   - Tarjetas de estadísticas (Presentes, Retardos, Ausentes)
   - Lista de empleados con horarios
   - Botones para exportar datos
```

### 6.3 Funcionalidades Principales

```
📊 Dashboard:
- Ver asistencia en tiempo real
- Filtrar por fecha
- Buscar empleados
- Exportar a Excel/CSV

📋 Reportes:
- Diario: hoy
- Semanal: últimos 7 días
- Mensual: mes actual
- Por empleado: historial completo

⚙️ Configuración:
- Horario de entrada
- Tolerancia de retardo
- Umbral de reconocimiento facial
- Puntos de marcaje

✅ Justificaciones:
- Ver solicitudes pendientes
- Aprobar/rechazar
- Agregar comentarios
```

---

## 🆘 Solución de Problemas

### Problema: iPad no reconoce rostros

**Soluciones:**
1. Verificar conexión WiFi
   ```
   - Ajustes → WiFi → Mostrar contraseña
   - Confirmar que está conectado
   ```

2. Recargar la página
   ```
   - Desliza hacia abajo en Safari para refrescar
   - O presiona el botón de recarga
   ```

3. Verificar permisos de cámara
   ```
   - Ajustes → Safari → Cámara y micrófono: Permitir
   ```

4. Limpiar lente de cámara
   ```
   - Usa un paño suave y seco
   ```

5. Verificar iluminación
   ```
   - Asegurar buena luz frontal
   - Evitar contraluz
   - Brillo máximo del iPad
   ```

### Problema: Reconoce persona equivocada

**Soluciones:**
1. Volver a registrar rostros
   ```
   - Capturar 5-7 fotos de diferentes ángulos
   - Usar buena iluminación
   - Diferentes distancias a la cámara
   ```

2. Ajustar umbral de reconocimiento
   ```
   - .env.local:
   NEXT_PUBLIC_FACE_RECOGNITION_THRESHOLD=0.5
   ```

### Problema: Dashboard no carga

**Soluciones:**
1. Verificar conexión a internet
2. Limpiar caché del navegador (Ctrl+Shift+Del)
3. Abrir en incógnito/privado
4. Verificar que Supabase esté activo:
   ```
   - Ve a supabase.com
   - Verifica el estado del proyecto
   ```

### Problema: "No se pudo acceder a la cámara"

**Soluciones:**
1. Reiniciar iPad
2. Cerrar Safari completamente
3. Volver a abrir la app
4. Si persiste:
   ```
   - Ajustes → Safari → Borrar historial y datos
   ```

### Problema: Las fotos de empleados no se muestran

**Soluciones:**
1. Verificar que Storage buckets estén creados
2. Verificar que bucket sea público
3. Verificar URLs en base de datos
4. Comprobar que el archivo existe

---

## 📚 Información Adicional

### Estructura de Carpetas

```
colegio-asistencia/
├── app/
│   ├── layout.tsx              # Layout principal
│   ├── globals.css             # Estilos globales
│   ├── page.tsx                # Página de inicio
│   ├── marcaje/
│   │   └── page.tsx            # Pantalla para iPads
│   └── admin/
│       └── page.tsx            # Dashboard RRHH
├── components/
│   ├── Marcaje/                # Componentes de marcaje
│   │   ├── CamaraReconocimiento.tsx
│   │   ├── PantallaMarcaje.tsx
│   │   └── MarcajeConfirmacion.tsx
│   └── Dashboard/              # Componentes del dashboard
│       ├── TarjetasEstadisticas.tsx
│       ├── ListaAsistencia.tsx
│       └── BarraBusca.tsx
├── lib/
│   ├── supabase.ts             # Cliente Supabase
│   ├── faceRecognition.ts      # Lógica de reconocimiento
│   ├── utils.ts                # Utilidades
│   └── store.ts                # Estado global (Zustand)
├── types/
│   └── index.ts                # TypeScript types
├── public/
│   └── models/                 # Modelos de face-api.js
├── supabase_schema.sql         # Schema de base de datos
├── package.json                # Dependencias
├── tsconfig.json               # Configuración TypeScript
├── tailwind.config.ts          # Configuración Tailwind
└── .env.example                # Variables de entorno ejemplo
```

### Variables de Entorno Disponibles

```
NEXT_PUBLIC_SUPABASE_URL              # URL de Supabase (requerido)
NEXT_PUBLIC_SUPABASE_ANON_KEY        # API Key de Supabase (requerido)
NEXT_PUBLIC_APP_NAME                 # Nombre de la aplicación
NEXT_PUBLIC_APP_URL                  # URL de la aplicación
NEXT_PUBLIC_FACE_RECOGNITION_THRESHOLD  # Umbral de confianza (0.6)
NEXT_PUBLIC_IPAD_1_NAME              # Nombre iPad 1
NEXT_PUBLIC_IPAD_2_NAME              # Nombre iPad 2
NEXT_PUBLIC_IPAD_3_NAME              # Nombre iPad 3
NEXT_PUBLIC_IPAD_4_NAME              # Nombre iPad 4
NEXT_PUBLIC_ENABLE_OFFLINE_MODE      # Soporte offline (true/false)
```

### Colores Institucionales

```
Azul Principal:    #1E40AF
Azul Claro:        #3B82F6
Amarillo:          #FCD34D
Blanco:            #FFFFFF
Verde (Éxito):     #10B981
Rojo (Error):      #EF4444
```

### Contacto y Soporte

```
Email:      soporte@colegio.com
Teléfono:   +593-XXXX-XXXX
Horario:    Lunes - Viernes, 8:00 AM - 5:00 PM
```

---

## ✅ Checklist de Despliegue

- [ ] Supabase configurado y verificado
- [ ] Código clonado localmente
- [ ] Variables de entorno configuradas
- [ ] Modelos de face-api.js descargados
- [ ] Pruebas locales exitosas
- [ ] Código subido a GitHub
- [ ] Desplegado en Vercel
- [ ] iPads preparados y conectados
- [ ] Aplicación instalada en Home de iPads
- [ ] Acceso Guiado configurado
- [ ] Personal registrado en base de datos
- [ ] Rostros capturados
- [ ] Usuario RRHH creado
- [ ] Dashboard probado

---

**Última actualización: Febrero 2026**
**Versión: 1.0.0**

¡Tu sistema de asistencia está listo para usar! 🎉
