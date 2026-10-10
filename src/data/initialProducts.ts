import { Product } from '../types';
import productsJson from './products.json';

export const DB_VERSION = "2026_v4_amazon_images";

export const initialProducts: Product[] = productsJson as Product[];
