import { Product } from '../types';
import productsJson from './products.json';

export const DB_VERSION = "2026_v5_local_uploads";

export const initialProducts: Product[] = productsJson as Product[];
