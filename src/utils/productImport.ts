import { Product } from '../types';
import { generateProductSlug } from '../context/StoreContext';

/**
 * Normalizes CSV headers to standard fields
 */
function cleanKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Splits a CSV text respecting double quotes
 */
export function parseCSVText(csvText: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentLine += '"';
      i++; // Skip escaped quote
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \r\n
      }
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  // Parse header line
  const parseRow = (rowStr: string): string[] => {
    const values: string[] = [];
    let curVal = '';
    let inQ = false;
    for (let j = 0; j < rowStr.length; j++) {
      const c = rowStr[j];
      const nc = rowStr[j + 1];
      if (c === '"' && inQ && nc === '"') {
        curVal += '"';
        j++;
      } else if (c === '"') {
        inQ = !inQ;
      } else if (c === ',' && !inQ) {
        values.push(curVal.trim());
        curVal = '';
      } else {
        curVal += c;
      }
    }
    values.push(curVal.trim());
    return values;
  };

  const headers = parseRow(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseRow(lines[i]);
    if (rowValues.length === 0 || rowValues.every(v => !v)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = rowValues[index] ?? '';
    });
    records.push(rowObj);
  }

  return records;
}

/**
 * Determines product category based on string
 */
function mapCategory(catStr: string): Product['category'] {
  const s = (catStr || '').toLowerCase();
  if (s.includes('tech') || s.includes('audio') || s.includes('electr') || s.includes('phone') || s.includes('comput') || s.includes('soft') || s.includes('digital')) {
    return 'tech';
  }
  if (s.includes('fit') || s.includes('sport') || s.includes('health') || s.includes('bottle') || s.includes('hydrat')) {
    return 'fitness';
  }
  if (s.includes('wear') || s.includes('bag') || s.includes('watch') || s.includes('case') || s.includes('access')) {
    return 'accessories';
  }
  return 'everyday';
}

/**
 * Converts Payhip CSV or generic e-commerce CSV export records to Product objects
 */
export function convertPayhipRowsToProducts(rows: Record<string, string>[]): Product[] {
  return rows.map((row, idx) => {
    // Look up fields in a case-insensitive, key-normalized way
    const mapped: Record<string, string> = {};
    Object.keys(row).forEach(k => {
      mapped[cleanKey(k)] = row[k];
    });

    // Payhip standard columns:
    // "Title" / "Name" / "Product Title"
    // "Price" / "Regular Price"
    // "Sale Price" / "Compare At Price"
    // "Description" / "Body (HTML)"
    // "Image URL" / "Images" / "Image" / "Cover Image"
    // "Category" / "Type" / "Tags"
    // "Inventory" / "Stock"
    const title =
      mapped['title'] ||
      mapped['producttitle'] ||
      mapped['name'] ||
      mapped['productname'] ||
      mapped['itemname'] ||
      `Imported Product #${idx + 1}`;

    const description =
      mapped['description'] ||
      mapped['bodyhtml'] ||
      mapped['details'] ||
      mapped['summary'] ||
      'High quality item imported from Payhip catalog.';

    // Clean price string (e.g. "$49.99" -> 49.99)
    const rawPrice = mapped['price'] || mapped['regularprice'] || mapped['unitprice'] || mapped['amount'] || '29.99';
    const cleanPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 29.99;

    const rawOrigPrice = mapped['saleprice'] || mapped['compareatprice'] || mapped['originalprice'] || mapped['listprice'];
    let origPrice: number | undefined = undefined;
    if (rawOrigPrice) {
      const parsedOrig = parseFloat(rawOrigPrice.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedOrig) && parsedOrig > cleanPrice) {
        origPrice = parsedOrig;
      }
    }

    // Images
    const rawImage =
      mapped['imageurl'] ||
      mapped['image'] ||
      mapped['images'] ||
      mapped['coverimage'] ||
      mapped['picture'] ||
      mapped['photo'] ||
      mapped['img'] ||
      '';

    let imageUrl = rawImage;
    const additionalImages: string[] = [];

    if (rawImage.includes('|') || rawImage.includes(';') || (rawImage.includes(',') && rawImage.includes('http'))) {
      const splitImgs = rawImage.split(/[|;,]/).map(s => s.trim()).filter(s => s.startsWith('http'));
      if (splitImgs.length > 0) {
        imageUrl = splitImgs[0];
        additionalImages.push(...splitImgs);
      }
    }

    if (!imageUrl || !imageUrl.startsWith('http')) {
      // Fallback quality image
      imageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
    }

    if (additionalImages.length === 0) {
      additionalImages.push(imageUrl);
    }

    const rawCategory = mapped['category'] || mapped['type'] || mapped['producttype'] || mapped['tags'] || 'everyday';
    const category = mapCategory(rawCategory);

    const rawStock = mapped['stock'] || mapped['inventory'] || mapped['quantity'] || '50';
    const stock = parseInt(rawStock.replace(/[^0-9]/g, ''), 10) || 50;

    const customSlug = generateProductSlug(title);

    return {
      id: 'prod-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4),
      title,
      customSlug,
      category,
      price: cleanPrice,
      origPrice,
      stock,
      image: imageUrl,
      images: additionalImages,
      description,
      rating: 5.0,
      reviewsCount: Math.floor(Math.random() * 20) + 5,
      badge: origPrice ? 'Sale' : undefined,
    };
  });
}

/**
 * Exports products list to CSV string
 */
export function exportProductsToCSV(products: Product[]): string {
  const headers = ['id', 'title', 'category', 'price', 'origPrice', 'stock', 'image', 'images', 'customSlug', 'description', 'rating', 'reviewsCount'];
  
  const escapeCell = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = products.map(p => [
    escapeCell(p.id),
    escapeCell(p.title),
    escapeCell(p.category),
    escapeCell(p.price),
    escapeCell(p.origPrice ?? ''),
    escapeCell(p.stock),
    escapeCell(p.image),
    escapeCell(p.images?.join('|') ?? p.image),
    escapeCell(p.customSlug ?? ''),
    escapeCell(p.description),
    escapeCell(p.rating),
    escapeCell(p.reviewsCount)
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
