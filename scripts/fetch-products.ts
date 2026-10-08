const CF_ACCOUNT_ID = 'ae33acd14aaf2f0ad7bcb1f2e37b71b5';
const D1_DATABASE_ID = '0ccd6b48-b6d5-4cbe-95eb-71a9a32ee1b8';
const CF_API_TOKEN = 'cfut_fsq3lkgNkuYzBsn6skvvJ2d5OS6uQUgRGToZ7TJwcbc635cb';

async function fetchProducts() {
  console.log('Cloudflare D1-დან პროდუქტების ამოღება...');

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: 'SELECT * FROM products ORDER BY created_at DESC;',
        }),
      }
    );

    const data = (await response.json()) as any;

    if (!data.success) {
      console.error('შეცდომა D1-დან წამოღებისას:', JSON.stringify(data.errors, null, 2));
      return;
    }

    const products = data.result[0].results;
    console.log(`წარმატებით ამოიღო ${products.length} პროდუქტი:\n`);
    console.log(JSON.stringify(products, null, 2));

    return products;
  } catch (error) {
    console.error('სერვერთან კავშირის შეცდომა:', error);
  }
}

fetchProducts();
