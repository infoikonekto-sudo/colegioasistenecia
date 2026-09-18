#!/bin/bash

# Script de Setup para Sistema de Asistencia Biométrica
# Colegio Manos a la Obra - Febrero 2026

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Sistema de Asistencia Biométrica - Setup                 ║"
echo "║  Colegio Manos a la Obra                                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar si Node.js está instalado
echo "🔍 Verificando requisitos..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "   Descárgalo en: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js v$(node -v) encontrado"

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    exit 1
fi

echo "✅ npm v$(npm -v) encontrado"
echo ""

# Crear archivo .env.local si no existe
echo "📝 Configurando variables de entorno..."
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "✅ Archivo .env.local creado"
    echo ""
    echo "⚠️  IMPORTANTE: Edita .env.local con tus credenciales de Supabase:"
    echo "   NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_aqui"
    echo ""
    exit 0
else
    echo "✅ .env.local ya existe"
fi

# Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias"
    exit 1
fi

echo "✅ Dependencias instaladas"
echo ""

# Crear carpeta de modelos si no existe
echo "🤖 Verificando modelos de face-api.js..."
if [ ! -d "public/models" ]; then
    mkdir -p public/models
    echo "✅ Carpeta public/models creada"
    echo ""
    echo "⚠️  IMPORTANTE: Descarga los modelos desde:"
    echo "   https://github.com/justadudewhohacks/face-api.js/tree/master/weights"
    echo ""
    echo "   Archivos necesarios:"
    echo "   - ssd_mobilenetv1_model-weights_manifest.json"
    echo "   - ssd_mobilenetv1_model-shard1"
    echo "   - face_landmark_68_model-weights_manifest.json"
    echo "   - face_landmark_68_model-shard1"
    echo "   - face_recognition_model-weights_manifest.json"
    echo "   - face_recognition_model-shard1"
    echo "   - face_recognition_model-shard2"
    echo ""
    echo "   Coloca los archivos en: ./public/models/"
    echo ""
else
    # Verificar si hay archivos en models
    if [ -z "$(ls -A public/models 2>/dev/null)" ]; then
        echo "⚠️  Carpeta public/models está vacía"
        echo "   Necesitas descargar los modelos de face-api.js"
        echo "   Ver instrucciones arriba"
    else
        echo "✅ Modelos encontrados en public/models"
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  ✅ SETUP COMPLETADO                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📚 Próximos pasos:"
echo ""
echo "1️⃣  Configura variables de entorno:"
echo "   nano .env.local"
echo ""
echo "2️⃣  (Opcional) Descarga modelos de face-api.js:"
echo "   https://github.com/justadudewhohacks/face-api.js"
echo ""
echo "3️⃣  Ejecuta en desarrollo:"
echo "   npm run dev"
echo ""
echo "4️⃣  Abre en navegador:"
echo "   http://localhost:3000/marcaje"
echo ""
echo "5️⃣  Para más ayuda, ver INSTALACION.md"
echo ""
