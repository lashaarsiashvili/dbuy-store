const BIOMETRIC_VAULT_KEY = 'dbuy_biometric_vault_v1';

export const loadModels = async () => {
  // Mock: no-op
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

export const calculateEuclideanDistance = (d1: string, d2: string): number => {
  // Mock: simple equality check for base64 strings
  return d1 === d2 ? 0 : 1;
};
