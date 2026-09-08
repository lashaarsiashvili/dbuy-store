const https = require('https');
https.get('https://www.trustpilot.com/review/dbuystore.com', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/businessUnitId":"([^"]+)"/);
    if(match) console.log("FOUND_ID:", match[1]);
    else console.log("NOT FOUND. Length:", data.length);
  });
}).on('error', console.error);
