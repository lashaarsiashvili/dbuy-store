const fs = require('fs');

let trustContent = fs.readFileSync('src/components/TrustSection.tsx', 'utf8');

// Insert the TrustBox after the subtitle
const subtitleRegex = /({t\('trust\.subtitle'\)}\n\s*<\/p>)/;
const replacement = `$1
          {/* Trustpilot Official Rating Bar */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
             <div 
               className="trustpilot-widget" 
               data-locale="en-US" 
               data-template-id="5419b6a8b0d04a076446a9ad" 
               data-businessunit-id="" 
               data-style-height="24px" 
               data-style-width="100%" 
               data-theme="light">
               <a href="https://www.trustpilot.com/review/dbuystore.com" target="_blank" rel="noreferrer">Trustpilot</a>
             </div>
          </div>`;

trustContent = trustContent.replace(subtitleRegex, replacement);

fs.writeFileSync('src/components/TrustSection.tsx', trustContent);
