# 🎓 Sistema de Asistencia Biométrica
## Colegio Manos a la Obra

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-Active-brightgreen)

Mostrar imagen Mostrar imagen Mostrar imagen

Sistema moderno de control de asistencia con reconocimiento facial para instituciones educativas. Incluye 4 puntos de marcaje con iPads y dashboard administrativo en tiempo real para Recursos Humanos.

---

## ✨ Características Principales

### Para Empleados (iPads)
- 🎭 **Reconocimiento Facial Avanzado**: Detección en 1-2 segundos con face-api.js
- 📱 **Multi-punto**: 4 puntos de marcaje simultáneos
- ☁️ **Sincronización en Tiempo Real**: Supabase
- 📴 **Modo Offline**: Funciona sin internet
- 🎨 **Interfaz Amigable**: Diseño intuitivo para todos
- 📸 **Confirmación Visual**: Feedback inmediato al marcar

### Para RRHH (Dashboard Web)
- 📊 **Dashboard en Tiempo Real**: Estadísticas actualizadas
- 👥 **Gestión de Personal**: CRUD de empleados
- 📈 **Reportes Completos**: Diario, semanal, mensual
- 📥 **Exportación Excel**: Un clic para descargar
- ✅ **Gestión de Justificaciones**: Aprobar/rechazar ausencias
- 🔐 **Control de Acceso**: Roles y permisos

---

## 🎨 Identidad Visual

### Paleta de Colores
```
Azul Principal:     #1E40AF
Azul Claro:         #3B82F6
Amarillo:           #FCD34D
Blanco:             #FFFFFF
Verde (Éxito):      #10B981
Rojo (Error):       #EF4444
```

### Tipografía
- Font: System UI (Roboto, Segoe UI, etc.)
- Responsive: Funciona en todos los tamaños de pantalla

---

## 🏗️ Arquitectura del Sistema

```
┌──────────────────────────────────────────────────┐
│         4 iPads (Puntos de Marcaje)              │
│   Puerta 1 | Puerta 2 | Puerta 3 | Oficina      │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   SUPABASE CLOUD     │
        │  - PostgreSQL        │
        │  - Storage           │
        │  - Real-time Sync    │
        │  - Authentication    │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  DASHBOARD WEB       │
        │  - Reportes          │
        │  - Gestión Personal  │
        │  - Exportación       │
        └──────────────────────┘
```

---

## 📂 Stack Tecnológico

### Frontend
- **Framework**: Next.js 14 + React 18
- **Estilos**: Tailwind CSS
- **Reconocimiento Facial**: face-api.js + TensorFlow.js
- **Estado**: Zustand
- **Formularios**: React Hook Form

### Backend & Base de Datos
- **BaaS**: Supabase (Backend as a Service)
- **Base de Datos**: PostgreSQL
- **Autenticación**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### Deployment
- **Hosting**: Vercel
- **CDN**: Cloudflare (opcional)
- **Dominio**: colegiomanosalaobra.com

---

## 📊 Tablas de Base de Datos

### empleados
```
- id (UUID)
- nombre, apellido, cedula (UNIQUE)
- departamento, cargo
- foto_url
- face_descriptor (JSONB - encriptado)
- horario_entrada, tolerancia_minutos
- activo (BOOLEAN)
- timestamps
```

### marcajes
```
- id (UUID)
- empleado_id (FK)
- tipo ('entrada' | 'salida')
- fecha, hora, timestamp
- punto_marcaje, ipad_id
- foto_marcaje_url
- confianza (%)
- latitud, longitud (opcional)
- sincronizado
```

### justificaciones
```
- id (UUID)
- empleado_id (FK)
- fecha, motivo
- documento_url
- estado ('pendiente' | 'aprobada' | 'rechazada')
- aprobado_por (FK)
```

### usuarios_admin
```
- id (UUID)
- email (UNIQUE)
- nombre
- rol ('super_admin' | 'rrhh' | 'supervisor')
- departamento
- activo
```

---

## 🚀 Instalación Rápida

### Requisitos Previos
```
✅ Node.js 18+
✅ Git
✅ Cuenta de Supabase
✅ Cuenta de Vercel
✅ 4 iPads (8va gen o superior)
```

### Pasos Principales

**1. Configurar Supabase**
```bash
# Ver INSTALACION.md para instrucciones detalladas
```

**2. Clonar Proyecto**
```bash
git clone https://github.com/tu-usuario/colegio-asistencia.git
cd colegio-asistencia
```

**3. Instalar Dependencias**
```bash
npm install
```

**4. Configurar Variables de Entorno**
```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase
```

**5. Descargar Modelos de face-api.js**
```bash
# Ver INSTALACION.md para instrucciones
# Los archivos van en public/models/
```

**6. Ejecutar Localmente**
```bash
npm run dev
# Abre http://localhost:3000/marcaje
```

**7. Desplegar a Vercel**
```bash
# Sube a GitHub y conecta con Vercel
# Vercel desplegará automáticamente
```

### 📖 Ver [Guía Completa de Instalación](./INSTALACION.md)

---

## 📱 URLs de iPads

Cada iPad debe apuntar a una URL específica:

```
iPad 1 (Puerta 1):
https://tu-dominio.vercel.app/marcaje?punto=Puerta%201&ipad=ipad-1

iPad 2 (Puerta 2):
https://tu-dominio.vercel.app/marcaje?punto=Puerta%202&ipad=ipad-2

iPad 3 (Puerta 3):
https://tu-dominio.vercel.app/marcaje?punto=Puerta%203&ipad=ipad-3

iPad 4 (Oficina):
https://tu-dominio.vercel.app/marcaje?punto=Oficina&ipad=ipad-4
```

---

## 📊 Reportes Disponibles

### Reporte Diario
- Total presentes, retardos, ausentes
- Porcentaje de asistencia
- Desglose por departamento
- Empleados específicos con horarios

### Reporte Semanal
- Asistencia por día
- Patrones de retardo
- Ausencias recurrentes
- Tendencias

### Reporte Mensual
- Estadísticas generales
- Cálculo de horas trabajadas
- Pre-nómina
- Gráficos de tendencias

### Exportación
- 📥 Excel (XLSX)
- 📄 CSV
- 📊 PDF (próximamente)

---

## 🔐 Seguridad

### Protección de Datos Biométricos
- ❌ No se almacenan fotos completas del rostro
- ✅ Solo descriptores matemáticos (128 números)
- 🔒 Encriptación HTTPS en tránsito
- 🔒 Encriptación en reposo (Supabase)
- 🛡️ Row Level Security (RLS) en PostgreSQL

### Autenticación
- Supabase Auth
- Contraseñas encriptadas
- Sesiones seguras
- 2FA (próximamente)

### Control de Acceso
```
Super Admin:   Control total del sistema
RRHH:          Gestión de asistencia, reportes
Supervisor:    Solo su departamento
```

---

## 📈 Estadísticas y Métricas

El sistema rastrea automáticamente:
- ✅ Asistencia diaria
- ⏰ Puntualidad
- ⚠️ Retardos
- 📊 Tendencias mensuales
- 💼 Horas de trabajo
- 📱 Uso por punto de marcaje
- 🎯 Precisión del reconocimiento facial

---

## 🎯 Plan de Implementación

### Fase 1: Configuración (1 semana)
- [ ] Crear proyecto Supabase
- [ ] Configurar base de datos
- [ ] Crear buckets de storage
- [ ] Configurar autenticación

### Fase 2: Desarrollo (2 semanas)
- [ ] Setup Next.js + PWA
- [ ] Integrar face-api.js
- [ ] Diseñar pantallas
- [ ] Implementar reconocimiento
- [ ] Modo offline y sincronización

### Fase 3: Dashboard RRHH (1 semana)
- [ ] Interfaz administrativa
- [ ] Autenticación
- [ ] Reportes
- [ ] Exportación
- [ ] Gestión de justificaciones

### Fase 4: Registro de Personal (1 semana)
- [ ] Tomar fotos
- [ ] Generar descriptores
- [ ] Cargar en Supabase
- [ ] Validar reconocimiento

### Fase 5: Testing (1 semana)
- [ ] Pruebas con personal real
- [ ] Ajustar umbrales
- [ ] Validar reportes
- [ ] Testing offline

### Fase 6: Despliegue (1 semana)
- [ ] Instalar en 4 puntos
- [ ] Capacitación
- [ ] Lanzamiento suave
- [ ] Lanzamiento completo

---

## 💰 Estimación de Costos

### Desarrollo
- Desarrollo completo: $2,500 - $4,000 USD
- Tiempo estimado: 6-8 semanas

### Hardware (si no lo tienes)
- 4 iPads (8va gen): $1,200 - $1,600
- 4 Soportes: $200 - $300

### Servicios Mensuales
- Supabase: $0 - $25/mes
- Vercel: $0 - $20/mes
- Dominio: $10 - $15/año

### Total Inicial: $4,000 - $6,000 USD
### Costo Mensual: $25 - $50 USD

---

## 🚀 Roadmap (Futuras Fases)

### Fase 2 (3 meses)
- 📱 App móvil para empleados
- 🔔 Notificaciones push
- 📅 Gestión de vacaciones
- 💼 Control de permisos
- 🌐 Multi-idioma

### Fase 3 (6 meses)
- 📈 Reportes de productividad
- 💰 Integración con nómina
- 📊 Dashboard avanzado
- 🔌 API pública
- 🔗 Integraciones (Google Calendar, Slack)

### Fase 4 (Futuro)
- 🤖 ML para predicciones
- 📍 Geolocalización
- 🎥 Vigilancia integrada
- 📧 Notificaciones automáticas
- 👔 Portal de empleados

---

## 🎓 Capacitación

### Para Empleados (10 min)
- Cómo marcar entrada/salida
- Qué hacer si no reconoce
- Preguntas frecuentes

### Para RRHH (30 min)
- Acceder al dashboard
- Generar reportes
- Exportar datos
- Gestionar justificaciones
- Resolución de problemas

### Material Disponible
- 📖 Manual de usuario (PDF)
- 🎥 Videos tutoriales
- 💬 Chat de soporte
- 📞 Soporte técnico

---

## 🆘 Soporte Técnico

### Opciones de Soporte
```
Email:     soporte@colegio.com
Teléfono:  +593-XXXX-XXXX
Chat:      www.colegio.com/soporte
Horario:   Lunes-Viernes, 8AM-5PM
```

### Problemas Comunes
- iPad no reconoce → Verificar iluminación
- Dashboard no carga → Revisar internet
- Reconoce equivocado → Re-registrar rostros

Ver [Solución de Problemas](./INSTALACION.md#solución-de-problemas)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
Ver archivo [LICENSE](./LICENSE) para más detalles.

---

## 👥 Equipo de Desarrollo

**Desarrollado para:** Colegio Manos a la Obra
**Última actualización:** Febrero 2026
**Versión:** 1.0.0

### Tecnologías Usadas
- [Next.js](https://nextjs.org/) - React Framework
- [Supabase](https://supabase.io/) - Backend as a Service
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) - Face Recognition
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vercel](https://vercel.com/) - Hosting

---

## 🙏 Agradecimientos

Agradecemos a:
- **face-api.js** por la excelente librería de reconocimiento facial
- **Supabase** por el backend as a service
- **Vercel** por el hosting y deployment
- **Next.js** por el framework
- **Tailwind CSS** por los estilos

---

## 📞 Contacto

¿Preguntas o sugerencias? Contacta a:
- 📧 Email: soporte@colegio.com
- 🐦 Twitter: @colegiomanos
- 📍 Ubicación: Ambato, Ecuador

---

<div align="center">

## ¿Te gusta este proyecto? ¡Dale una ⭐!

**Hecho con ❤️ para la educación**

[↑ Volver al inicio](#-sistema-de-asistencia-biométrica)

</div>
