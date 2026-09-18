# Informe de Funcionamiento y Seguridad del Sistema de Asistencia
**Dirigido a:** Departamento de Recursos Humanos  
**Proyecto:** Sistema de Asistencia Biométrica - Colegio Manos a la Obra

---

A continuación, se detalla la respuesta a sus consultas sobre el funcionamiento del nuevo sistema de control de asistencia, redactado en un lenguaje claro y libre de tecnicismos complejos para su total comprensión.

### 1. Información y Almacenamiento

**¿Qué información se almacenará de cada colaborador?**  
Se almacenan datos básicos de identificación: Nombre, Apellidos, DPI (Documento de Identificación), Departamento, Cargo, y opcionalmente correo y teléfono. A nivel biométrico, **no se guarda una foto de la cara para reconocimiento**, sino un "mapa matemático" (vector) del rostro, que es un código numérico ilegible para el ojo humano. Adicionalmente, el sistema toma una fotografía normal como *evidencia* en el momento exacto en que la persona marca su asistencia.

**¿Dónde se almacenará esta información?**  
Toda la información se almacena de forma **100% centralizada en la Nube** utilizando servidores de alta seguridad. No hay servidores físicos dentro del colegio que puedan dañarse o requerir mantenimiento físico.

**¿La información queda en los iPads o estaciones?**  
**Es correcto, no queda nada en los iPads.** Los iPads funcionan únicamente como "ventanas" o "espejos" hacia el servidor en la nube. Una vez que el empleado marca su asistencia, la información viaja inmediatamente al servidor central y no se guarda ningún historial ni dato personal en la memoria permanente del iPad.

### 2. Seguridad y Acceso

**¿Existen medidas de seguridad para proteger la información?**  
Absolutamente.
*   **En tránsito:** Cuando el iPad envía la información a la nube, viaja a través de un "túnel privado" encriptado (similar al que usan los bancos por internet).
*   **Almacenamiento:** El servidor cuenta con "cerraduras digitales" (Políticas de Seguridad de Acceso) que garantizan que **solo el personal autorizado** (como Recursos Humanos o la Dirección) pueda acceder a la lista de empleados y reportes de asistencia mediante su usuario y contraseña.

**¿Se cuenta con respaldo y recuperación?**  
Sí, la plataforma en la nube utilizada realiza respaldos automáticos y constantes. En caso de una eventualidad extremadamente rara en los servidores principales, los datos pueden ser restaurados sin pérdida de información histórica.

### 3. Historial y Conservación

**¿Por cuánto tiempo se conservará la información?**  
El historial de asistencia no se borra automáticamente. Se conservará de manera indefinida, o por el tiempo que el colegio determine legalmente necesario. Gracias a que usamos la nube, el espacio es virtualmente ilimitado para almacenar años de registros.

**¿Qué ocurre cuando un trabajador deja de laborar en la empresa?**  
Al momento de la salida de un empleado, el administrador simplemente cambia su estado a **"Inactivo"** en el sistema. 
Esto hace dos cosas:
1. El sistema inmediatamente "olvida" su rostro y ya no le permitirá marcar asistencia en ningún kiosco.
2. Su nombre y su **historial de asistencia pasado se conservan intactos** en la base de datos para futuras auditorías o consultas legales de Recursos Humanos. 

### 4. Mantenimiento y Contingencias

**¿Quién quedará a cargo del soporte?**  
El soporte recae sobre el equipo de Tecnología de la Información (IT) del colegio o el desarrollador encargado, quienes tienen acceso al panel técnico de los servidores en la nube. Recursos Humanos solo se encarga de usar el sistema, no de mantenerlo.

**En caso de falla de internet o del sistema, ¿qué alternativas hay?**  
Dado que el sistema requiere internet para sincronizarse con la nube, si el colegio se queda sin internet de forma prolongada, el sistema de reconocimiento facial no podrá verificar la identidad. Como protocolo de contingencia, Recursos Humanos deberá llevar un registro manual (físico o en Excel local) temporalmente, y una vez regrese el internet, el Administrador puede ingresar al sistema e ingresar esas horas de forma manual indicando el motivo en las observaciones.

**¿Qué pasa si se pierde, daña o roban un iPad?**  
Como se mencionó en el punto 1, **el iPad está vacío**. Si alguien lo roba, no se lleva la información de los empleados ni sus rostros. Para evitar que el ladrón intente usar el iPad robado para enviar "marcajes falsos" por internet, el departamento técnico simplemente cambia un "PIN Secreto" en la nube. Al hacer esto, el iPad robado queda inmediatamente desconectado y obsoleto para el sistema.

### 5. Instalación y Crecimiento

**¿Qué se necesita para instalar una nueva estación?**  
Los requerimientos son mínimos:
1. Una toma de corriente (para mantener el iPad conectado y encendido).
2. Conexión estable a la red Wi-Fi del colegio.
3. Buena iluminación en el lugar (vital para que la cámara reconozca los rostros rápidamente).
*No se requieren cables de red especiales, servidores físicos, ni configuraciones complejas en el lugar.*

**¿Podemos iniciar con un iPad e ir agregando más sin límite?**  
**Sí, totalmente.** El sistema está diseñado para escalar. Puede empezar con un solo punto en la entrada principal, y el mes siguiente colocar otro en un edificio anexo. Todos los iPads se sincronizarán automáticamente con la misma base de datos central en tiempo real.

**¿Hay límite de empleados o registros?**  
No hay un límite técnico real dentro del uso de un colegio. El sistema puede manejar sin problemas desde 10 empleados hasta miles de ellos, y millones de marcajes a lo largo de los años. La única variante será el plan de almacenamiento contratado en la nube si el colegio crece masivamente en la próxima década.

### 6. Equipos y Especificaciones

Para futuras expansiones donde se requiera comprar nuevas estaciones (iPads o Tablets), se recomiendan las siguientes especificaciones mínimas para asegurar que el reconocimiento facial sea rápido y fluido (ya que requiere un poco de procesamiento de imagen):

*   **Dispositivo sugerido:** Apple iPad (8va Generación en adelante) o iPad Air (3ra Generación en adelante). 
*   **Alternativa en Android:** Samsung Galaxy Tab S6 Lite o modelos superiores.
*   **Cámara frontal:** Mínimo de 7 Megapíxeles o superior (para garantizar nitidez en el rostro).
*   **Navegador:** Siempre utilizar la versión más reciente de Google Chrome o Safari.
*   **Nota de diseño:** Se recomienda adquirir pedestales de seguridad (kioscos de pie o de pared) para proteger los equipos físicamente y mantenerlos siempre conectados a la corriente eléctrica.
