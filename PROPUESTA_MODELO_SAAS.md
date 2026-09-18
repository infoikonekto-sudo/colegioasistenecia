# 📄 DOCUMENTO EJECUTIVO: ANÁLISIS DE CÓDIGO Y MODELO DE NEGOCIO SaaS

**Proyecto:** Sistema de Control de Asistencia Biométrica, RRHH e Inventarios  
**Formato de Cobro:** Software as a Service (SaaS)  
**Moneda:** Dólares Estadounidenses ($ USD)  
**Fecha:** Septiembre 2026  
**Versión:** 1.0  

---

## 📋 1. RESUMEN EJECUTIVO Y VALOR TÉCNICO

El presente documento detalla la estructura técnica, módulos funcionales, análisis de arquitectura, evaluación de inversión inicial (CAPEX), costos operativos recurrentes (OPEX) y el modelo de precios comercial bajo la modalidad **SaaS (Software as a Service)** para el sistema de control de asistencia biométrica facial y gestión de recursos humanos.

### Ventaja Competitiva Clave
A diferencia de las soluciones biológicas convencionales que requieren hardware dedicado (huelleros o relojes marcadores con costos de $800-$2,500 USD por dispositivo), este sistema utiliza **inteligencia artificial de detección facial procesada en el cliente (Browser/Tablet via WebGL/TensorFlow.js)**. Esto reduce los costos de servidor a niveles marginales y permite utilizar iPads o tablets estándar como estaciones de marcaje de alta velocidad.

---

## 🛠️ 2. ANÁLISIS FUNCIONAL Y ARCHIVOS DEL PROYECTO

El sistema está desarrollado sobre la pila tecnológica moderna **Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS** y **Supabase** (PostgreSQL, Storage y Auth).

```
colegio-asistencia/
├── app/
│   ├── admin/                # Panel de Administración de RRHH
│   │   ├── configuracion/    # Horarios, tolerances, asuetos y kioscos
│   │   ├── empleados/        # Gestión de personal y departamentos
│   │   ├── inventarios/      # Control de stock y entregas de uniformes/herramientas
│   │   ├── registrar-rostro/ # Módulo de enrolamiento biométrico 3D
│   │   └── reportes/         # Reportes gráficos, métricas y justificantes
│   ├── api/                  # Endpoints API Serverless protegidos
│   │   ├── estaciones/       # Gestión de kioscos autorizados
│   │   └── marcajes/         # Registro biométrico con fotos de evidencia
│   └── marcaje/              # Interfaz en tiempo real para iPads/Kioscos
├── components/               # Componentes UI reutilizables
├── lib/                      # Motores biométricos, PDF, Excel y Supabase
└── supabase_schema.sql       # Esquema completo de la base de datos PostgreSQL
```

### Módulos Principales del Sistema:

1. **Motor de Inteligencia Artificial Biométrico**
   - Archivos: [`lib/facialRecognitionEngine.ts`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/lib/facialRecognitionEngine.ts), [`lib/biometricWorkerClient.ts`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/lib/biometricWorkerClient.ts).
   - Funcionalidad: Extracción de 128 vectores descriptores faciales, comparación por distancia euclidiana (threshold < 0.5), algoritmo anti-spoofing y ejecución delegada a Web Workers para evitar bloqueos de pantalla.

2. **Estación de Marcaje / Kiosco iPad (Tiempo Real)**
   - Archivos: [`app/marcaje/page.tsx`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/app/marcaje/page.tsx), [`components/Marcaje/PantallaMarcaje.tsx`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/components/Marcaje/PantallaMarcaje.tsx), [`components/Marcaje/CamaraReconocimiento.tsx`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/components/Marcaje/CamaraReconocimiento.tsx), [`components/Marcaje/LectorQR.tsx`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/components/Marcaje/LectorQR.tsx).
   - Funcionalidad: Detección facial fluida en vivo, lectura de QR alternativo, captura silenciosa de fotos de evidencia y validación de seguridad mediante PIN de estación (`x-kiosk-pin`).

3. **Gestión de Personal, Departamentos y Carnet Digital**
   - Archivos: [`app/admin/empleados/page.tsx`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/app/admin/empleados/page.tsx), [`components/Admin/EmpleadoForm.tsx`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/components/Admin/EmpleadoForm.tsx), [`components/Admin/CarnetDigitalModal.tsx`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/components/Admin/CarnetDigitalModal.tsx).
   - Funcionalidad: Administración de personal, creación dinámica de departamentos con códigos autogenerados y emisión de carnets digitales institucionales con código QR listo para imprimir.

4. **Horarios, Tolerancias, Asuetos y Multi-Sede**
   - Archivos: [`app/admin/configuracion/page.tsx`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/app/admin/configuracion/page.tsx), [`app/api/estaciones/route.ts`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/app/api/estaciones/route.ts).
   - Funcionalidad: Configuración por área de hora de entrada, salida, receso y minutos de gracia (tolerancia). Gestión de días festivos, vacaciones y aislamiento de estaciones por Sede (Multi-Sede).

5. **Analítica, Justificaciones y Exportación PDF/Excel**
   - Archivos: [`app/admin/reportes/page.tsx`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/app/admin/reportes/page.tsx), [`lib/exportUtils.ts`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/lib/exportUtils.ts).
   - Funcionalidad: Cálculo automatizado de puntualidad, retardos y ausencias. Gráficos dinámicos (`recharts`), módulo de justificación de faltas y descarga formal de reportes en PDF y Excel.

6. **Módulo de Inventarios y Vales de Entrega con Firma Digital**
   - Archivos: [`app/admin/inventarios/page.tsx`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/app/admin/inventarios/page.tsx), [`lib/valePDF.ts`](file:///c:/Users/Ludin%20Solis/Desktop/RRHH/colegio-asistencia/lib/valePDF.ts).
   - Funcionalidad: Control de inventario (uniformes, equipos, insumos), registro de entregas a empleados y generación automática de Vales de Entrega PDF firmados digitalmente en pantalla con `react-signature-canvas`.

---

## 💰 3. DESGLOSE DE COSTO INICIAL (CAPEX / INVERSIÓN INICIAL)

El **Costo Inicial** abarca el valor del desarrollo de la propiedad intelectual, el costo de equipamiento físico (hardware para el cliente) y los cargos por implementación inicial (Onboarding).

### A. Valor del Activo de Software (Desarrollo Realizado)
*   **Horas de Ingeniería:** ~180 - 220 horas de desarrollo full-stack, IA facial y arquitectura de base de datos.
*   **Valor estimado del software en el mercado:** **$4,500.00 - $8,000.00 USD**.

### B. Hardware Sugerido por Estación / Punto de Marcaje (Costo para el cliente final)
| Elemento | Descripción | Costo Estimado ($ USD) |
| :--- | :--- | :--- |
| **iPad (9na o 10ma Generación)** | Pantalla 10.2", cámara frontal HD para marcaje fluido | $290.00 - $350.00 USD |
| **Soporte de Pared / Base Antirrobo** | Base metálica con cerradura y soporte de carga continua | $45.00 - $75.00 USD |
| **Instalación Eléctrica / Cableado** | Cable de alimentación reforzado de 3m | $15.00 - $25.00 USD |
| **TOTAL HARDWARE POR PUNTO** | **Equipamiento listo por estación** | **~$350.00 - $450.00 USD** |

### C. Tarifa Única de Configuración e Implementación (Setup / Onboarding Fee)
Cobro único por cliente al iniciar el contrato SaaS para cubrir:
*   Configuración inicial de la cuenta en Supabase / Tenant.
*   Carga masiva de la nómina inicial de empleados.
*   Enrolamiento biométrico de rostros del personal.
*   Configuración de iPads en modo "Acceso Guiado".
*   Capacitación al equipo de Recursos Humanos.

*   **Tarifa Única de Setup Sugerida:** **$150.00 - $350.00 USD** (según tamaño de la empresa/colegio).

---

## ⚙️ 4. COSTOS OPERATIVOS RECURRENTES (OPEX / SERVIDORES)

Dado que la IA corre en los dispositivos cliente, los costos de infraestructura en la nube son extremadamente bajos y predecibles.

| Servicio Cloud | Plan Sugerido | Descripción de Recursos | Costo Mensual ($ USD) |
| :--- | :--- | :--- | :--- |
| **Supabase Cloud** | Pro Plan | Base de datos PostgreSQL dedicada, Auth, Realtime y 100 GB de Storage para fotos de evidencias | **$25.00 USD / mes** |
| **Vercel Cloud** | Pro Plan | Hosting Next.js 14, CDN Edge mundial y ejecuciones Serverless seguras | **$20.00 USD / mes** |
| **Dominio Web (.com / .app)** | Registro anual | Dominio institucional SSL con protección WHOIS | **$1.25 USD / mes** ($15/año) |
| **TOTAL INFRAESTRUCTURA INICIAL** | **Atiende hasta 25-30 clientes SaaS** | **Capacidad para ~5,000 marcajes diarios** | **~$46.25 USD / mes** |

> 📌 **Costo Marginal por Cliente Adicional:** Menos de **$1.00 USD al mes** en almacenamiento de imágenes.

---

## 🏷️ 5. MATRIZ DE PRECIOS SaaS EN DÓLARES ($ USD)

Recomendamos estructurar la oferta comercial bajo **3 Planes Principales por suscripción mensual/anual** y cobros de **Add-ons**.

```
  ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
  │     PLAN STARTER     │    │       PLAN PRO       │    │   PLAN ENTERPRISE    │
  │     $29 USD / mes    │    │     $79 USD / mes    │    │    $199 USD / mes    │
  │  (Hasta 50 Empleados)│    │ (Hasta 250 Empleados)│    │(Hasta 1000 Empleados)│
  └──────────────────────┘    └──────────────────────┘    └──────────────────────┘
```

### Tabla Comparativa de Planes

| Funcionalidad / Recurso | 🥉 PLAN STARTER | 🥈 PLAN PRO *(Recomendado)* | 🥇 PLAN ENTERPRISE |
| :--- | :--- | :--- | :--- |
| **Precio Mensual** | **$29.00 USD / mes** | **$79.00 USD / mes** | **$199.00 USD / mes** |
| **Precio Anual (Pago de Contado)** | **$290.00 USD / año** *(Ahorra 2 meses)* | **$790.00 USD / año** *(Ahorra 2 meses)* | **$1,990.00 USD / año** *(Ahorra 2 meses)* |
| **Límite de Empleados** | Hasta 50 empleados | Hasta 250 empleados | Hasta 1,000 empleados |
| **Sedes / Ubicaciones Incluidas** | 1 Sede | Hasta 3 Sedes | Sedes Ilimitadas |
| **Estaciones de Marcaje (iPads)** | Hasta 2 Estaciones | Estaciones Ilimitadas | Estaciones Ilimitadas |
| **Reconocimiento Facial + QR** | ✅ Incluido | ✅ Incluido | ✅ Incluido |
| **Horarios y Tolerancias** | ✅ Estándar por área | ✅ Avanzado por departamento | ✅ Reglas personalizadas |
| **Historial de Evidencias** | 30 días de fotos | 12 meses de fotos | Historial Ilimitado |
| **Carnet Digital con QR** | ❌ No disponible | ✅ Incluido | ✅ Incluido |
| **Módulo Inventarios & Vales** | ❌ No disponible | ✅ Con Firma Digital | ✅ Con Firma Digital |
| **Reportes y Exportaciones** | Formato Excel | Formato Excel + PDF con Logo | Excel + PDF + API Webhooks |
| **Soporte Técnico** | Vía Ticket / Email | Soporte Prioritario WhatsApp | Gerente de cuenta + SLA 99.9% |

---

### ➕ Módulos Adicionales (Add-Ons Opcionales)

*   **Paquete Adicional de 50 Empleados:** **+$15.00 USD / mes**.
*   **Sede / Sucursal Adicional:** **+$20.00 USD / mes**.
*   **Capacitación Presencial u Onsite:** **+$100.00 USD** por sesión.

---

### 🧮 Opción Alternativa: Cobro Estricto Por Empleado Activo
Si la empresa prefiere pagar exactamente por su número de colaboradores:
*   **Tarifa:** **$1.50 USD por empleado activo al mes**.
*   **Factura Mínima Mensual:** **$30.00 USD / mes**.
*   *Ejemplo:* Un colegio con 140 empleados paga: `140 x $1.50 = $210.00 USD / mes`.

---

## 📈 6. PROYECCIÓN FINANCIERA Y MARGEN DE GANANCIA

A continuación se presenta el Estado de Resultados Proyectado (P&L) a medida que escalas la base de clientes SaaS:

### Escenario A: 10 Clientes (Fase Inicial / Lanzamiento)
*   **Distribución:** 4 Starter ($116) + 5 Pro ($395) + 1 Enterprise ($199)
*   **Ingresos Brutos Mensuales (MRR):** **$710.00 USD / mes**
*   **Ingresos Anuales (ARR):** **$8,520.00 USD / año**
*   **Costos Operativos de Servidor (OPEX):** -$46.25 USD / mes
*   **Ganancia Neta Mensual:** **$663.75 USD / mes**
*   📊 **Margen de Ganancia Neta:** **93.4%**

---

### Escenario B: 35 Clientes (Fase de Crecimiento)
*   **Distribución:** 15 Starter ($435) + 15 Pro ($1,185) + 5 Enterprise ($995)
*   **Ingresos Brutos Mensuales (MRR):** **$2,615.00 USD / mes**
*   **Ingresos Anuales (ARR):** **$31,380.00 USD / año**
*   **Costos Operativos de Servidor (OPEX):** -$65.00 USD / mes *(Aumento menor de Storage)*
*   **Ganancia Neta Mensual:** **$2,550.00 USD / mes**
*   📊 **Margen de Ganancia Neta:** **97.5%**

---

### Escenario C: 100 Clientes (Fase de Consolidación)
*   **Ingresos Brutos Mensuales (MRR):** **~$7,800.00 USD / mes**
*   **Ingresos Anuales (ARR):** **~$93,600.00 USD / año**
*   **Costos Operativos de Servidor (OPEX):** -$150.00 USD / mes
*   **Ganancia Neta Mensual:** **$7,650.00 USD / mes**
*   📊 **Margen de Ganancia Neta:** **98.0%**

---

## 🚀 7. ESTRATEGIA COMERCIAL Y RECOMENDACIONES

1.  **Prueba Gratuita de 14 Días (Free Trial):**  
    Permite a los colegios o empresas instalar la App en un iPad de prueba para que experimenten la velocidad del reconocimiento facial sin compromiso.

2.  **Estrategia de Venta Cruzada (Cross-Selling):**  
    Promocionar el módulo de **Inventario con Firma Digital** (`lib/valePDF.ts`) como el gran diferenciador frente a sistemas de asistencia tradicionales. Permite entregar uniformes, computadoras o herramientas con respaldo de firma en pantalla.

3.  **Descuento por Contrato Anual:**  
    Ofrecer 2 meses gratis al pagar el año por adelantado. Esto asegura flujo de caja inmediato (Cash Flow) y reduce la tasa de cancelación (Churn Rate).

4.  **Modelo B2B Directo:**  
    Dirigirse activamente a:
    *   Colegios y Escuelas Privadas.
    *   Empresas con múltiples sucursales o tiendas de retail.
    *   Fábricas, oficinas de logística y plantas de producción.

---

**Documento elaborado y validado para implementación y comercialización SaaS.**  
*Sistema de Asistencia Biométrica v1.0*
