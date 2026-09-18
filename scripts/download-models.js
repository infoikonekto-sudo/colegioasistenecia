const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, '../public/models');

// Crear directorio si no existe
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log(`✓ Carpeta creada: ${modelsDir}`);
}

const models = [
  {
    name: 'SSD MobileNet',
    files: [
      'ssd_mobilenetv1_model-weights_manifest.json',
      'ssd_mobilenetv1_model-weights.bin',
    ],
  },
  {
    name: 'Face Landmark 68',
    files: [
      'face_landmark_68_model-weights_manifest.json',
      'face_landmark_68_model-weights.bin',
    ],
  },
  {
    name: 'Face Recognition',
    files: [
      'face_recognition_model-weights_manifest.json',
      'face_recognition_model-weights.bin',
    ],
  },
];

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

async function downloadFile(fileName) {
  return new Promise((resolve, reject) => {
    const fileUrl = CDN_URL + fileName;
    const filePath = path.join(modelsDir, fileName);

    // Saltar si ya existe
    if (fs.existsSync(filePath)) {
      console.log(`✓ Ya existe: ${fileName}`);
      resolve();
      return;
    }

    console.log(`⬇ Descargando: ${fileName}`);
    const file = fs.createWriteStream(filePath);

    https.get(fileUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✓ Descargado: ${fileName}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Eliminar archivo incompleto
      reject(err);
    });
  });
}

async function downloadAllModels() {
  console.log('\n📦 Descargando modelos de Face-API...\n');

  try {
    for (const model of models) {
      console.log(`\n${model.name}:`);
      for (const file of model.files) {
        await downloadFile(file);
      }
    }
    console.log('\n✅ ¡Todos los modelos descargados correctamente!\n');
  } catch (error) {
    console.error('\n❌ Error descargando modelos:', error.message);
    console.error('\n💡 Solución alternativa: Usa CDN en lib/faceRecognition.ts');
    console.error('   Cambia: const MODEL_URL = \'/models\';');
    console.error('   Por:    const MODEL_URL = \'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/\';\n');
    process.exit(1);
  }
}

downloadAllModels();
