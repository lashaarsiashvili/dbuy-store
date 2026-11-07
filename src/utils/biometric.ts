import * as faceapi from '@vladmandic/face-api';

const BIOMETRIC_VAULT_KEY = 'dbuy_biometric_vault_v1';

export const loadModels = async () => {
  const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
    faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
  ]);
};

export const getBiometricVault = () => {
  try {
    const saved = localStorage.getItem(BIOMETRIC_VAULT_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

export const saveBiometricVault = (vault: any) => {
  localStorage.setItem(BIOMETRIC_VAULT_KEY, JSON.stringify(vault));
};

export const calculateEuclideanDistance = (d1: Float32Array, d2: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    sum += Math.pow(d1[i] - d2[i], 2);
  }
  return Math.sqrt(sum);
};
