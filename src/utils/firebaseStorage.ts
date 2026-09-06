import { storage } from '../lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export const uploadImageToFirebase = async (dataUrl: string, prefix = 'uploads'): Promise<string | null> => {
  if (!storage) {
    console.warn('Firebase Storage is not initialized');
    return null;
  }
  
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;

  try {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);
    const matches = dataUrl.match(/^data:image\/(.+);base64,/);
    const ext = matches && matches[1] ? matches[1] : 'jpg';
    const filename = `${prefix}/${timestamp}-${rand}.${ext}`;
    
    const storageRef = ref(storage, filename);
    await uploadString(storageRef, dataUrl, 'data_url');
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image to Firebase Storage:', error);
    return null;
  }
};
