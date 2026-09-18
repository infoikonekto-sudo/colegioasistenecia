# Sistema de Asistencia Biométrica - Guía Rápida

## Inicio Rápido (5 minutos)

### 1. Clonar y Instalar
```bash
git clone https://github.com/tu-usuario/colegio-asistencia.git
cd colegio-asistencia
npm install
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env.local
```

Edita `.env.local` y agrega tus credenciales de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_aqui
```

### 3. Ejecutar
```bash
npm run dev
```

Abre: `http://localhost:3000/marcaje`

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev          # Ejecutar en desarrollo

# Build
npm run build        # Compilar para producción
npm run start        # Iniciar servidor de producción

# Linting
npm run lint         # Verificar código
npm run type-check   # Verificar tipos TypeScript

# Database
npm run db:seed      # Ejecutar seeds (crear datos iniciales)
npm run db:reset     # Resetear base de datos
```

---

## Estructura de Carpetas Explicada

```
colegio-asistencia/
│
├── 📁 app/
│   ├── layout.tsx              ← Layout principal (header, footer)
│   ├── globals.css             ← Estilos globales
│   ├── page.tsx                ← Redirige a /marcaje
│   ├── 📁 marcaje/
│   │   └── page.tsx            ← Pantalla para iPads
│   └── 📁 admin/
│       └── page.tsx            ← Dashboard RRHH
│
├── 📁 components/
│   ├── 📁 Marcaje/             ← Componentes de marcaje
│   │   ├── CamaraReconocimiento.tsx    ← Cámara + detección
│   │   ├── PantallaMarcaje.tsx         ← Pantalla principal
│   │   └── MarcajeConfirmacion.tsx     ← Confirmación (2 seg)
│   └── 📁 Dashboard/           ← Componentes del dashboard
│       ├── TarjetasEstadisticas.tsx    ← Stats (Presentes, etc)
│       ├── ListaAsistencia.tsx         ← Lista de empleados
│       └── BarraBusca.tsx              ← Búsqueda y filtros
│
├── 📁 lib/
│   ├── supabase.ts             ← Cliente Supabase + API calls
│   ├── faceRecognition.ts      ← Lógica de face-api.js
│   ├── utils.ts                ← Funciones utilitarias
│   └── store.ts                ← Estado global (Zustand)
│
├── 📁 types/
│   └── index.ts                ← Tipos TypeScript
│
├── 📁 public/
│   └── 📁 models/              ← Modelos face-api.js
│       ├── ssd_mobilenetv1_model-weights_manifest.json
│       ├── ssd_mobilenetv1_model-shard1
│       └── ... (más archivos)
│
├── 📁 styles/
│   └── (estilos adicionales si los hay)
│
├── 📄 package.json             ← Dependencias
├── 📄 tsconfig.json            ← Config TypeScript
├── 📄 tailwind.config.ts       ← Config Tailwind
├── 📄 next.config.js           ← Config Next.js
├── 📄 postcss.config.js        ← Config PostCSS
├── 📄 .env.example             ← Ejemplo de variables
├── 📄 .gitignore               ← Archivos ignorados
├── 📄 supabase_schema.sql      ← Schema de BD
├── 📄 README.md                ← Este archivo
├── 📄 INSTALACION.md           ← Guía completa
└── 📄 QUICK_START.md           ← Guía rápida (este archivo)
```

---

## Flujo de la Aplicación

### Para Empleados (iPad)
```
1. iPad muestra pantalla de cámara
2. Empleado se coloca frente a cámara
3. Sistema detecta rostro y genera descriptor
4. Busca coincidencia en base de datos
5. Si coincide:
   - Crea registro de marcaje
   - Muestra confirmación (2 segundos)
   - Vuelve a pantalla de cámara
6. Si no coincide:
   - Muestra error
   - Permite reintentar
```

### Para RRHH (Dashboard)
```
1. Inicia sesión con email/password
2. Ve dashboard con:
   - Estadísticas del día
   - Lista de asistencias
   - Opciones para filtrar/buscar
3. Puede:
   - Ver detalles de un empleado
   - Exportar datos a Excel
   - Justificar ausencias
   - Ver histórico
```

---

## Variables de Entorno Disponibles

```env
# REQUERIDAS
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# OPCIONALES (con valores por defecto)
NEXT_PUBLIC_APP_NAME="Colegio Manos a la Obra"
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FACE_RECOGNITION_THRESHOLD=0.6
NEXT_PUBLIC_IPAD_1_NAME="Puerta 1"
NEXT_PUBLIC_IPAD_2_NAME="Puerta 2"
NEXT_PUBLIC_IPAD_3_NAME="Puerta 3"
NEXT_PUBLIC_IPAD_4_NAME="Oficina"
NEXT_PUBLIC_ENABLE_OFFLINE_MODE=true
NEXT_PUBLIC_ENABLE_LOCATION_TRACKING=false
NEXT_PUBLIC_PHOTO_CAPTURE_ON_ATTENDANCE=false
```

---

## Integración con Supabase

### Estructure de Tablas
```
empleados          → Datos personales + descriptores faciales
marcajes           → Registros de entrada/salida
justificaciones    → Solicitudes de ausencia
usuarios_admin     → Usuarios del dashboard
configuracion      → Configuraciones del sistema
logs_auditoria     → Auditoría de cambios
```

### Relaciones
```
empleados ←→ marcajes (one-to-many)
empleados ←→ justificaciones (one-to-many)
empleados ←→ usuarios_admin (one-to-many, aprobadores)
```

---

## Reconocimiento Facial Explicado

### Flujo
```
1. Video en tiempo real (canvas)
2. Cada frame → detecta rostros
3. Si hay rostro → extrae descriptor (128 números)
4. Compara con descriptores almacenados
5. Si distancia < 0.6 → RECONOCIDO
6. Si distancia >= 0.6 → NO RECONOCIDO
```

### Modelos Usados
```
ssd_mobilenetv1      → Detectar rostro en imagen
faceLandmark68       → Puntos faciales (ojos, boca, etc)
faceRecognition      → Generar descriptor (embeddings)
```

### Ajustes Disponibles
```
NEXT_PUBLIC_FACE_RECOGNITION_THRESHOLD=0.6
- 0.5: Más leniente (menos errores de no-reconocimiento)
- 0.6: Recomendado (balance perfecto)
- 0.7: Más estricto (menos falsos positivos)
```

---

## Desplegue a Producción

### En Vercel

```bash
# 1. Push a GitHub
git push origin main

# 2. Conectar Vercel
# - Ve a vercel.com
# - Conecta tu repositorio
# - Configura variables de entorno
# - Vercel despliega automáticamente

# 3. Tu URL será
https://colegio-asistencia.vercel.app
```

### En Servidor Propio

```bash
# Build
npm run build

# Start
npm run start

# O usar PM2 para mantener ejecutándose
npm install -g pm2
pm2 start "npm run start"
```

---

## Testing

### Prueba Local
```bash
# 1. Abre http://localhost:3000/marcaje
# 2. Permite acceso a cámara
# 3. Colócate frente a cámara
# 4. Sistema debe detectar rostro
```

### Prueba sin Cámara
```bash
# Modifica CamaraReconocimiento.tsx para usar imágenes de prueba
# en lugar de video en vivo
```

### Prueba del Dashboard
```bash
# 1. Ve a http://localhost:3000/admin
# 2. Inicia sesión con tus credenciales
# 3. Deberías ver datos de Supabase
```

---

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "No se pudo acceder a la cámara" | Verificar permisos en navegador/iPad |
| Variables no cargadas | Reiniciar `npm run dev` |
| Errores de Supabase | Verificar URL y API key en `.env.local` |
| Dashboard no carga datos | Verificar que tabla `empleados` tenga datos |
| Reconocimiento no funciona | Descargar modelos en `public/models/` |
| iPad dice "Página no disponible" | Verificar WiFi y URL correcta |

---

## Recursos Útiles

### Documentación
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.io/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [face-api.js](https://github.com/justadudewhohacks/face-api.js)

### Herramientas
- [Supabase Studio](https://app.supabase.com) - Administrar BD
- [Vercel Dashboard](https://vercel.com/dashboard) - Deployments
- [VS Code](https://code.visualstudio.com/) - Editor recomendado

---

## Tips & Mejores Prácticas

### ✅ Haz esto
```javascript
// Usar componentes funcionales con hooks
const MiComponente = () => {
  const [estado, setEstado] = useState(null);
  return <div>{estado}</div>;
};

// Usar TypeScript para types
interface Empleado {
  id: string;
  nombre: string;
}

// Usar Tailwind para estilos
<div className="bg-primary text-white rounded-lg p-4" />
```

### ❌ Evita esto
```javascript
// No usar var
var x = 5;

// No hacer API calls sin manejo de errores
const data = await fetch(url);

// No usar divs para todo
<div className="flex">
  <div>Esto es spam de divs</div>
</div>

// Usar <section>, <article>, etc
<section className="flex">
  <h2>Mejor</h2>
</section>
```

---

## Próximos Pasos

1. **Instalar y ejecutar localmente** ✅
2. **Probar reconocimiento facial**
3. **Registrar empleados en Supabase**
4. **Configurar iPads**
5. **Desplegar a Vercel**
6. **Capacitar al personal**
7. **Recopilar feedback**
8. **Ajustar y mejorar**

---

## ¿Necesitas Ayuda?

- 📖 Ver [INSTALACION.md](./INSTALACION.md) para guía completa
- 📖 Ver [README.md](./README.md) para descripción del proyecto
- 💬 Abrir issue en GitHub
- 📧 Contactar soporte@colegio.com

---

**¡Listo para empezar! 🚀**

Última actualización: Febrero 2026
