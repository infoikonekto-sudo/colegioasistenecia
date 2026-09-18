# 🚀 Guía Rápida: Cómo subir actualizaciones a Vercel

Si necesitas subir nuevos cambios del sistema a producción en el futuro sin complicarte, aquí tienes las dos únicas formas de hacerlo resumidas en pasos muy sencillos.

---

## Opción 1: Subida por Consola (Recomendado y más profesional)

Esta es la forma oficial y más rápida si ya estás dentro del editor de código.

1. Abre tu terminal (donde siempre ejecutas los comandos).
2. Escribe el siguiente comando y presiona Enter:
   ```bash
   npx vercel login ludin@ikonekto.com
   ```
3. La consola te dará un enlace. Haz clic en él (o cópialo en tu navegador) y acepta el inicio de sesión.
4. Cuando te diga "Success", escribe este comando final:
   ```bash
   npx vercel --prod
   ```
5. ¡Listo! Vercel subirá automáticamente tus archivos, los compilará y actualizará tu página en internet.

*(Nota: Si ya habías iniciado sesión recientemente, puedes saltarte el paso 2 y 3, y escribir directamente `npx vercel --prod`).*

---

## Opción 2: Arrastrar y Soltar (A prueba de errores)

Si la consola te da problemas técnicos, te marca "Not authorized" o simplemente no quieres usar comandos, usa este método visual:

1. **Empaqueta tu código:** Selecciona todas las carpetas y archivos importantes de tu proyecto (excepto `node_modules` y `.git`) y comprímelos en un archivo `.zip`.
2. Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta.
3. En tu panel principal (Dashboard), ve al botón negro que dice **"Add New..."** y elige **"Project"**.
4. Verás una gran área con el icono de una nube que dice "Upload". **Arrastra y suelta tu archivo `.zip` ahí.**
5. Ponle un nombre al proyecto y dale a **Deploy**.

¡Vercel procesará tu ZIP en segundos y la actualización estará publicada en internet!
