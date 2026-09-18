# 🔧 Configuración de Supabase

## Paso 1: Crear cuenta en Supabase

1. Ir a [supabase.com](https://supabase.com)
2. Click en "Sign Up" (Registrarse)
3. Crear una cuenta con email o GitHub
4. Crear un nuevo proyecto:
   - **Nombre del proyecto**: `colegio-asistencia` (o tu preferencia)
   - **Región**: Seleccionar la más cercana a tu ubicación
   - **Database password**: Guardar en lugar seguro
5. Esperar a que se cree el proyecto (2-3 minutos)

## Paso 2: Obtener las credenciales

En el dashboard de Supabase:

1. Ir a **Settings** → **API**
2. Copiar:
   - **Project URL** → Este es tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon key** (public key) → Este es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Paso 3: Crear la base de datos

En el dashboard de Supabase:

1. Ir a **SQL Editor**
2. Crear una nueva query
3. Copiar y pegar el contenido de `supabase_schema.sql`
4. Click en "Run" para ejecutar el script
5. Esperar a que se ejecute (5-10 segundos)

**✅ Resultado**: Se crearán automáticamente:
- 6 tablas (empleados, marcajes, justificaciones, etc.)
- Índices para optimización
- Triggers para actualización de timestamps
- Funciones personalizadas
- Políticas de Row Level Security (RLS)

## Paso 4: Configurar variables de entorno

1. Abrir el archivo `.env.local` en la carpeta del proyecto
2. Reemplazar los valores placeholder:

```env
# Supabase Configuration (OBLIGATORIO)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration (opcional)
NEXT_PUBLIC_APP_NAME=Colegio Manos a la Obra
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Dónde encontrar tus valores:

**NEXT_PUBLIC_SUPABASE_URL**:
- En Supabase: Settings → API → Project URL
- Ejemplo: `https://abcdefghijklmnop.supabase.co`

**NEXT_PUBLIC_SUPABASE_ANON_KEY**:
- En Supabase: Settings → API → anon key
- Es una cadena larga que comienza con `eyJ...`

## Paso 5: Crear usuarios de administración (opcional)

En el dashboard de Supabase:

1. Ir a **Authentication** → **Users**
2. Click en "Invite" (Invitar)
3. Agregar email de administratores
4. Los usuarios recibirán un email de confirmación

## Paso 6: Probar la configuración

En tu terminal, desde la carpeta del proyecto:

```bash
# Instalar dependencias (si no lo hizo)
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Luego abrir `http://localhost:3000` en el navegador.

**✅ Debe verse**: El sistema cargará datos de Supabase sin errores

## ¿Tienes problemas?

### Error: "Failed to load resource: net::ERR_NAME_NOT_RESOLVED"
- ✗ Variables de entorno no están configuradas
- ✓ Solución: Verificar `.env.local` y reiniciar servidor (`Ctrl+C` y `npm run dev`)

### Error: "NEXT_PUBLIC_SUPABASE_URL is missing"
- ✗ Variable de entorno faltante
- ✓ Solución: Asegúrate de que `.env.local` existe y tiene los valores correctos

### Datos no aparecen en el dashboard
- ✗ Base de datos no tiene datos
- ✓ Solución: Agregar empleados desde la página `/login` o directamente en Supabase

## URLs importantes

| Componente | URL |
|-----------|-----|
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **Tu Proyecto** | https://tuproyecto.supabase.co |
| **Aplicación Local** | http://localhost:3000 |
| **Sistema de Marcaje** | http://localhost:3000/marcaje |
| **Dashboard Admin** | http://localhost:3000/admin |
| **Login** | http://localhost:3000/login |

## Estructura de datos creada

### Tabla: `empleados`
- ID del empleado
- Nombre, apellido, cédula
- Departamento, cargo
- Foto, descriptor facial
- Estado activo/inactivo

### Tabla: `marcajes`
- Timestamp de entrada/salida
- Referencia al empleado
- Tipo (entrada/salida)
- Estado (a_tiempo/tarde/ausente)

### Tabla: `justificaciones`
- Razón de ausencia
- Documentos
- Estado (pendiente/aprobado/rechazado)

### Tabla: `usuarios_admin`
- Email de administrador
- Rol y permisos
- Último acceso

## 🔐 Seguridad

El sistema incluye:
- ✅ Row Level Security (RLS) habilitado
- ✅ Política de autenticación obligatoria
- ✅ Datos cifrados en tránsito (HTTPS/TLS)
- ✅ Contraseñas hasheadas con bcrypt

**Importante**: 
- Nunca compartir tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- La key anon es pública (es para el navegador)
- Para operaciones sensibles, usar una Service Role Key en el servidor

## Siguiente paso

Una vez configurado, consulta [QUICK_START.md](./QUICK_START.md) para:
- Cargar fotos de empleados
- Registrar asistencias
- Usar el dashboard de RRHH
