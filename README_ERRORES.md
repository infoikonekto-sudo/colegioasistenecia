# 🔍 Diagnóstico y Solución de Errores

## Errores que observaste y cómo resolverlos

### 1. ❌ Hydration Error
```
Text content does not match server-rendered HTML.
```

**Causa**: Next.js renderiza contenido en el servidor que no coincide con lo que renderiza el cliente.

**Solución** ✅: Ya arreglado en [app/layout.tsx](./app/layout.tsx)
- Movimos los meta tags de las meta tags deprecated a la configuración de Metadata
- Ahora Next.js maneja correctamente los meta tags

---

### 2. ❌ Deprecated Meta Tags
```
<meta name="apple-mobile-web-app-capable"> is deprecated
```

**Causa**: Apple cambió el estándar de esta meta tag.

**Solución** ✅: Ya arreglado en [app/layout.tsx](./app/layout.tsx)
- Cambié de `apple-mobile-web-app-capable` a `mobile-web-app-capable`
- Usé la propiedad `appleWebApp` en la Metadata

---

### 3. ❌ Face API Not Available
```
Error cargando modelos de face-api: Error: Face API not available
```

**Causa**: El dynamic import de face-api.js no estaba funcionando correctamente.

**Solución** ✅: Ya arreglado en [lib/faceRecognition.ts](./lib/faceRecognition.ts)
- Mejoré el manejo del dynamic import
- Agregué caching de promesas para evitar cargas duplicadas
- Agregué mejor manejo de errores

**Paso adicional**: Descargar modelos
- Ejecuta: `npm run setup-models`
- O modifica `lib/faceRecognition.ts` para usar CDN:
  ```typescript
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
  ```

---

### 4. ❌ Supabase Connection Failing
```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
your-project.supabase.co/rest/v1/empleados...
```

**Causa**: La URL de Supabase usa el placeholder `your-project.supabase.co`

**Solución** ✅: Configurar variables de entorno
1. Copia el archivo `.env.local` (ya existe)
2. Reemplaza `your-project.supabase.co` con tu URL real
3. Reemplaza `your-anon-key` con tu clave anon
4. Reinicia el servidor: `Ctrl+C` y `npm run dev`

Para obtener tus credenciales:
- Supabase Dashboard → Settings → API
- Copia "Project URL" y "anon key"

Ver: [CONFIGURACION_SUPABASE.md](./CONFIGURACION_SUPABASE.md)

---

## Checklist de Configuración

- [ ] ¿Configuraste `.env.local` con tus credenciales de Supabase?
- [ ] ¿Creaste la base de datos ejecutando `supabase_schema.sql`?
- [ ] ¿Descargaste los modelos de face-api con `npm run setup-models`?
- [ ] ¿Reiniciaste el servidor después de cambios?

---

## Estado Actual

| Componente | Estado | Acción Requerida |
|-----------|--------|------------------|
| **Next.js** | ✅ Compilando sin errores | - |
| **React Hydration** | ✅ Arreglado | - |
| **Face-API** | ⚠️ Necesita modelos | Ejecuta: `npm run setup-models` |
| **Supabase** | ⚠️ No configurado | Ver: `CONFIGURACION_SUPABASE.md` |
| **Meta Tags** | ✅ Modernizados | - |

---

## Próximos pasos

1. **Configurar Supabase** (5 minutos)
   ```bash
   # Edita .env.local con tus credenciales
   # Copia NEXT_PUBLIC_SUPABASE_URL
   # Copia NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. **Descargar modelos** (1 minuto)
   ```bash
   npm run setup-models
   ```

3. **Reiniciar servidor**
   ```bash
   Ctrl+C
   npm run dev
   ```

4. **Verificar en navegador**
   - http://localhost:3000/marcaje → Debería ver la cámara
   - http://localhost:3000/admin → Dashboard sin datos (normal sin empleados)
   - http://localhost:3000/login → Formulario de login

---

## ¿Aún tienes errores?

### Face API no carga
- **Solución rápida**: Usa CDN en lugar de archivos locales
- Edita: `lib/faceRecognition.ts` línea 13
- Cambia: `const MODEL_URL = '/models';`
- Por: `const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';`

### Supabase aún no conecta
- Verifica que `.env.local` tiene los valores correctos (sin comillas)
- Asegúrate de que Supabase tiene la base de datos creada
- Ejecuta: `supabase_schema.sql` en SQL Editor de Supabase

### La cámara no se activa
- Permite el acceso a la cámara en tu navegador
- Chrome/Edge: Settings → Privacy → Camera → Permitir
- Firefox: Permitir cuando pida

---

## Archivos modificados en esta sesión

1. `app/layout.tsx` - Meta tags modernizados
2. `lib/faceRecognition.ts` - Dynamic import mejorado
3. `.env.local` - Creado (necesita tus credenciales)
4. `CONFIGURACION_SUPABASE.md` - Nuevo (instrucciones Supabase)
5. `MODELOS_FACEAPI.md` - Nuevo (instrucciones modelos)
6. `package.json` - Script `npm run setup-models` agregado

---

## Soporte adicional

Para más detalles, consulta:
- [QUICK_START.md](./QUICK_START.md) - Guía rápida
- [README.md](./README.md) - Documentación completa
- [INSTALACION.md](./INSTALACION.md) - Instalación detallada
