# 🗄️ CREAR LA BASE DE DATOS EN SUPABASE

## 📍 Dónde está el archivo
El archivo SQL se encuentra aquí:
```
colegio-asistencia/supabase_schema.sql
```

## 📋 Pasos para crear la base de datos

### Paso 1: Accede a Supabase
1. Abre https://supabase.com/dashboard
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto "colegio-asistencia"

### Paso 2: Abre el SQL Editor
En el panel izquierdo:
1. Click en **SQL Editor**
2. Click en **New Query** (Crear Nueva Query)

### Paso 3: Copiar el SQL
1. Abre el archivo: `supabase_schema.sql`
2. **Ctrl+A** para seleccionar todo
3. **Ctrl+C** para copiar

### Paso 4: Pega en Supabase
1. En Supabase, pega el contenido en el editor SQL
2. Click en el botón azul **Run** (o presiona Ctrl+Enter)
3. Espera 10-15 segundos a que termine

### Paso 5: Verificar que funcionó
Deberías ver el mensaje: ✅ **"Success"**

Si ves un error rojo, copia el mensaje y busca ayuda.

---

## ✅ ¿Qué se creará?

Cuando ejecutes el SQL, se crearán automáticamente:

### Tablas (6 tablas)
- **empleados** - Datos de los empleados
- **marcajes** - Registro de asistencias (entrada/salida)
- **justificaciones** - Ausencias justificadas
- **usuarios_admin** - Cuentas de administrador
- **configuracion** - Configuración del sistema
- **logs_auditoria** - Registro de auditoría

### Índices
- Indices para búsquedas rápidas
- Optimización de la base de datos

### Funciones
- `obtener_estadisticas_dia()` - Calcular estadísticas diarias
- `sincronizar_marcajes()` - Sincronización de datos

### Vistas (Tablas de solo lectura)
- `asistencia_diaria_detallada` - Vista detallada de asistencia
- `resumen_mensual` - Resumen mensual

### Seguridad
- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas de acceso automáticas
- ✅ Encriptación de datos

---

## 🎯 Después de crear la BD

### 1. Configurar variables de entorno
Abre `.env.local` y asegúrate que tenga:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-aqui
```

Obtén estos valores en: **Settings → API** (en Supabase)

### 2. Reiniciar el servidor
En la terminal:
```bash
Ctrl+C
npm run dev
```

### 3. Probar que funciona
Abre: http://localhost:3000/admin

Deberías ver el dashboard (aunque vacío, sin errores)

---

## ❌ Errores comunes

### "Error: query "create table empleados" failed"
- Significa que la tabla ya existe
- No importa, el script lo maneja automáticamente

### No veo "Success"
- El script sigue ejecutando (puede tardar 15 segundos)
- Espera un poco más
- Si aún no funciona, copia el error y busca ayuda

### El dashboard sigue con errores
1. Verifica que `.env.local` tiene las credenciales correctas
2. Reinicia el servidor (`Ctrl+C` y `npm run dev`)
3. Espera 30 segundos para que recompile

---

## 📂 Estructura del archivo SQL

El archivo tiene estas secciones (en orden):

1. **Crear tablas**
2. **Crear índices**
3. **Crear funciones**
4. **Crear vistas**
5. **Configurar RLS (Row Level Security)**
6. **Crear políticas de acceso**

Cada sección tiene comentarios explicando qué hace.

---

## 💡 Tips

- ✅ Puedes ejecutar el SQL varias veces sin problemas
- ✅ Si hay un error, ve al final del archivo y busca dónde falló
- ✅ Las políticas de RLS están configuradas automáticamente
- ✅ No necesitas hacer nada más después de ejecutar el SQL

---

## ¿Necesitas ayuda?

Si algo falla:
1. Copia el mensaje de error completo
2. Verifica que estés en Supabase (no en otra BD)
3. Asegúrate de que el proyecto está creado
4. Intenta ejecutar el SQL de nuevo

**Buenas noticias**: El sistema está 100% funcional una vez que ejecutes este SQL.
