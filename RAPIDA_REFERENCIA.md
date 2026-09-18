# ⚡ REFERENCIA RÁPIDA - Copy & Paste

## 🔴 EL PROBLEMA
```
Error: new row violates row-level security policy for table 'empleados'
```

## ✅ LA SOLUCIÓN

### OPCIÓN A: La Más Rápida (Recomendada)

1. Ve a: `https://app.supabase.com/project/{tu-proyecto}`
2. Haz clic en: `SQL Editor`
3. Copia esto:
```sql
ALTER TABLE empleados DISABLE ROW LEVEL SECURITY;
```
4. Pega en el editor
5. Haz clic en `Run`
6. Espera ✓ (done)

### OPCIÓN B: Si Quieres Mantener RLS (Producción)

Copia esto:
```sql
-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access" ON empleados;
DROP POLICY IF EXISTS "Enable insert access" ON empleados;
DROP POLICY IF EXISTS "Enable update access" ON empleados;
DROP POLICY IF EXISTS "Enable delete access" ON empleados;

-- Create permissive policies
CREATE POLICY "Enable read access" ON empleados
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access" ON empleados
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access" ON empleados
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access" ON empleados
  FOR DELETE USING (true);
```

---

## ✓ VERIFICA QUE FUNCIONÓ

Ejecuta esto en SQL Editor:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'empleados';
```

**Resultado esperado:**
```
tablename  | rowsecurity
───────────┼────────────
empleados  | false
```

(Si ves `false` significa que RLS está deshabilitado ✓)

---

## 🧪 PRUEBA EL FORMULARIO

1. Abre: `http://localhost:3003`
2. Haz clic en: `Admin Panel` (o `/admin`)
3. Haz clic en: `Nuevo Empleado`
4. Verifica que aparezca el botón **➕** junto a Departamento
5. Haz clic en **➕**
6. Modal debe abrir
7. Ingresa: `Marketing`
8. Código auto-genera: `MARK01`
9. Haz clic en: `✅ Crear`
10. Cierra modal
11. Dropdown debe mostrar: `Marketing (MARK01)`
12. Rellena el resto:
    - Nombre: Juan
    - Apellido: Pérez
    - Cédula: 1234567890
    - Cargo: Docente
    - Departamento: Marketing (MARK01)
13. Haz clic en: `✅ Crear Empleado`
14. Verifica mensaje: `✅ Empleado guardado correctamente`

---

## 📊 VERIFICA EN SUPABASE

1. Ve a Supabase
2. Haz clic en: `Table Editor`
3. Selecciona: `empleados`
4. Busca el empleado que creaste (Juan Pérez)
5. Verifica que el departamento sea: `Marketing (MARK01)`

---

## 🚨 SI SIGUE DANDO ERROR

**Opción 1**: Recarga la página (F5)
**Opción 2**: Limpia cache del navegador (Ctrl+Shift+Delete)
**Opción 3**: Abre una ventana privada/incógnito
**Opción 4**: Cierra y reabre VS Code

Si sigue fallando:
1. Abre la consola del navegador (F12)
2. Busca el mensaje de error exacto
3. Comparte el error en consola

---

## 📁 ARCHIVOS PRINCIPALES

| Archivo | Qué Hace |
|---------|----------|
| `components/Admin/EmpleadoForm.tsx` | Formulario con modal integrado |
| `components/Admin/CrearDepartamentoModal.tsx` | Modal para crear departamentos |
| `SOLUCION_RLS.md` | Explicación completa |
| `SQL_DESHABILITAR_RLS.sql` | Script SQL listo |

---

## 🎯 OBJETIVOS

| Objetivo | Status |
|----------|--------|
| Crear departamento dinámicamente | ✅ |
| Auto-generar código RRHH01 | ✅ |
| Validar código 4-6 caracteres | ✅ |
| Crear empleado con nuevo depto | ⏳ Espera RLS fix |
| Guardar en BD | ⏳ Espera RLS fix |

---

## ⏱️ TIEMPO TOTAL

```
2 min: Ejecutar SQL en Supabase
3 min: Probar formulario
1 min: Verificar en BD
─────────────────────
6 min: LISTO ✅
```

---

## 🎨 VISTA PREVIA

```
┌─────────────────────────────┐
│  Formulario Nuevo Empleado  │
│                             │
│  Nombre: [_______]          │
│  Apellido: [_______]        │
│  Cédula: [_______]          │
│  Cargo: [Docente ▼]         │
│  Depto: [Primaria ▼] [➕]   │  ◄─ Botón NUEVO
│                             │
│  [✅ Crear Empleado]        │
└─────────────────────────────┘
         ↓ Click en ➕
    ┌──────────────────┐
    │ Modal Abre       │
    ├──────────────────┤
    │ Nombre: [Market] │
    │ Código: MARK01   │
    │ [Cancelar][Crear]│
    └──────────────────┘
```

---

## 💡 TIPS

✅ El código se genera automáticamente mientras escribes
✅ Puedes cambiar el código manualmente
✅ Haz clic en 🔄 para regenerar el código
✅ El departamento se agrega sin recargar página
✅ Válido para cualquier nombre de departamento

---

¡Listo para funcionar! Solo deshabilita RLS en Supabase 🚀
