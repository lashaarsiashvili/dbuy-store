const fs = require('fs');

let trustContent = fs.readFileSync('src/components/TrustSection.tsx', 'utf8');
const ratingRegex = /{\/\* Trustpilot Official Rating Bar \*\/}[\s\S]*?<\/a>\n\s*<\/div>/;
trustContent = trustContent.replace(ratingRegex, '');
fs.writeFileSync('src/components/TrustSection.tsx', trustContent);

let indexContent = fs.readFileSync('index.html', 'utf8');
const script = `    <!-- Trustpilot Integration -->
    <script>
      (function(w,d,s,r,n){w.TrustpilotObject=n;w[n]=w[n]||function(){(w[n].q=w[n].q||[]).push(arguments)};
          a=d.createElement(s);a.async=1;a.src=r;a.type='text/java'+s;f=d.getElementsByTagName(s)[0];
          f.parentNode.insertBefore(a,f)})(window,document,'script', 'https://invitejs.trustpilot.com/tp.min.js', 'tp');
          tp('register', 'UgGVjqJjusXj5QbQ');
    </script>
  </head>`;
indexContent = indexContent.replace(/<\/head>/, script);
fs.writeFileSync('index.html', indexContent);

