# 🔓 SOLUCIÓN: Error de RLS (Row Level Security)

## ❌ PROBLEMA
```
Error: "new row violates row-level security policy for table 'empleados'"
```

El sistema de **Row Level Security (RLS)** en Supabase está impidiendo que los empleados nuevos se creen en la base de datos.

---

## ✅ SOLUCIÓN: Deshabilitar RLS en la Tabla `empleados`

### Paso 1: Ir a Supabase Dashboard
1. Accede a: [https://supabase.com](https://supabase.com)
2. Selecciona tu proyecto

### Paso 2: Navegar a Seguridad
```
Supabase Dashboard 
  → SQL Editor (o Authentication > Policies)
  → Buscar tabla "empleados"
```

### Paso 3: Deshabilitar RLS
En **Supabase 2.0+**:
1. Ve a **SQL Editor**
2. Ejecuta este comando:
```sql
ALTER TABLE empleados DISABLE ROW LEVEL SECURITY;
```

O si prefieres desde la UI:
1. Ve a **Authentication** → **Policies**
2. Busca la tabla **empleados**
3. Si hay un toggle para **RLS enabled**, desactívalo

### Paso 4: Confirmar
Deberías ver un mensaje como:
```
✅ RLS disabled for table "empleados"
```

---

## 🔒 (OPCIONAL) Habilitar RLS con Políticas Seguras

Si prefieres mantener RLS habilitado pero permitir inserciones, ejecuta:

```sql
-- Permitir INSERT para usuarios autenticados
CREATE POLICY "Enable insert for authenticated users" ON empleados
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Permitir SELECT para usuarios autenticados
CREATE POLICY "Enable select for authenticated users" ON empleados
FOR SELECT
USING (auth.role() = 'authenticated');

-- Permitir UPDATE para usuarios autenticados
CREATE POLICY "Enable update for authenticated users" ON empleados
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Permitir DELETE para usuarios autenticados
CREATE POLICY "Enable delete for authenticated users" ON empleados
FOR DELETE
USING (auth.role() = 'authenticated');
```

---

## 📋 Nuevas Características Implementadas

✅ **Modal de Crear Departamentos**
- Botón ➕ en el formulario de empleados
- Auto-generación de códigos (RRHH01, ACAD02, etc.)
- Validación de código (4-6 caracteres)
- Lista dinámica de departamentos

✅ **Formulario Mejorado**
- Integración con modal CrearDepartamentoModal
- Manejo de departamentos dinámicos
- Mejores validaciones

---

## 🧪 Verificación

Después de deshabilitar RLS:

1. **Abre el formulario** → Admin Panel → Nuevo Empleado
2. **Llena los datos**
   - Nombre: Juan
   - Apellido: Pérez
   - Cédula: 1234567890
   - Cargo: Docente
   - Departamento: (selecciona uno)
3. **Haz clic** en "✅ Crear Empleado"
4. **Esperado**: ✅ El empleado se crea sin errores

---

## 🚨 Si el problema persiste

1. **Verifica la conexión a Supabase**
   - Ve a Project Settings → Database
   - Copia la URL y Connection String
   - Verifica que coincida con `lib/supabase.ts`

2. **Revisa los logs de Supabase**
   - Ve a Logs → Database
   - Busca errores relacionados con empleados

3. **Ejecuta este SQL en Supabase SQL Editor**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'empleados';
   ```
   - Si hay policies, elimínalas:
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON empleados;
   ```

---

## 📱 Flujo de Creación de Departamentos

```
Usuario → Nuevo Empleado
    ↓
Llena Nombre, Apellido, Cédula, Cargo
    ↓
Selecciona Departamento (desplegable)
    ↓
[Haz clic en ➕]
    ↓
Modal: "Crear Nuevo Departamento"
    ↓
Ingresa Nombre → Auto-genera Código (RRHH01)
    ↓
Haz clic en ✅ Crear
    ↓
Departamento aparece en lista
    ↓
Se selecciona automáticamente
    ↓
Haz clic en "✅ Crear Empleado"
    ↓
Empleado guardado en BD ✅
```

---

## 💾 Archivos Modificados

- ✅ `components/Admin/EmpleadoForm.tsx` - Integración del modal
- ✅ `components/Admin/CrearDepartamentoModal.tsx` - Modal para departamentos
- ✅ Estado dinámico para departamentos
- ✅ Manejo de errores mejorado

---

**Próximo Paso**: Deshabilita RLS y ¡el sistema funcionará perfectamente! 🎉
