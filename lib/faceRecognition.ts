// Client-side only - face-api.js requires browser environment
let faceapi: any = null;
let faceapiPromise: Promise<any> | null = null;

export const loadFaceAPI = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Face API requires browser environment');
  }

  if (faceapi) return faceapi;
  if (faceapiPromise) return faceapiPromise;

  faceapiPromise = (async () => {
    try {
      // Dynamic import only works in browser
      const faceAPIModule = await import('face-api.js');
      faceapi = faceAPIModule;
      return faceapi;
    } catch (error) {
      console.error('Failed to load face-api.js:', error);
      faceapiPromise = null;
      throw error;
    }
  })();

  return faceapiPromise;
};

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;

  try {
    const api = await loadFaceAPI();
    if (!api) throw new Error('Face API not available');
    
    await Promise.all([
      api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  } catch (error) {
    console.error('Error cargando modelos de face-api:', error);
    throw error;
  }
};

export const detectFace = async (input: HTMLVideoElement | HTMLCanvasElement) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  try {
    const api = await loadFaceAPI();
    const detections = await api.detectAllFaces(input).withFaceLandmarks().withFaceDescriptors();
    return detections;
  } catch (error) {
    console.error('Error in detectFace:', error);
    throw error;
  }
};

export const detectSingleFace = async (input: HTMLVideoElement | HTMLCanvasElement) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  try {
    const api = await loadFaceAPI();
    const detection = await api.detectSingleFace(input).withFaceLandmarks().withFaceDescriptor();
    return detection;
  } catch (error) {
    console.error('Error in detectSingleFace:', error);
    throw error;
  }
};

export const compareFaceDescriptors = (
  descriptor1: Float32Array,
  descriptor2: Float32Array,
  threshold = 0.42
) => {
  const distance = euclideanDistance(descriptor1, descriptor2);
  return distance < threshold ? distance : null;
};

export const euclideanDistance = (a: Float32Array, b: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

export const matchFaceDescriptor = (
  detectedDescriptor: Float32Array,
  storedDescriptors: (number[] | null)[]
) => {
  let bestMatch = null;
  let minDistance = Infinity;

  for (const stored of storedDescriptors) {
    if (!stored) continue;

    const storedArray = new Float32Array(stored);
    const distance = euclideanDistance(detectedDescriptor, storedArray);

    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = distance;
    }
  }

  return {
    matched: minDistance < 0.36,
    distance: minDistance,
    confidence: Math.round(Math.max(0, (1 - minDistance / 0.36) * 100)),
  };
};

export const getFaceDescriptor = async (input: HTMLVideoElement | HTMLCanvasElement) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  try {
    const api = await loadFaceAPI();
    const detection = await api.detectSingleFace(input).withFaceLandmarks().withFaceDescriptor();
    return detection?.descriptor || null;
  } catch (error) {
    console.error('Error getting face descriptor:', error);
    throw error;
  }
};

export const faceDetectionEnabled = (): boolean => {
  return typeof window !== 'undefined' && 'getUserMedia' in navigator.mediaDevices;
};
