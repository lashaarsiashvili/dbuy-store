const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
const tpScript = `    <script type="text/javascript" src="//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js" async></script>
  </head>`;
content = content.replace(/<\/head>/, tpScript);
fs.writeFileSync('index.html', content);
