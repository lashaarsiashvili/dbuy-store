const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf8');

// The customer confirmation email block is where we want to add the BCC.
// Look for the customer email dispatch block.
const bccLine = "          bcc: 'dbuystore.com+4f18ff2f22@invite.trustpilot.com',";
const regex = /sendMailWithRetry\(\{\n\s*from: '"DBUY Store" <support@dbuystore\.com>',\n\s*to: customerEmail,\n\s*subject: customerEmailData\.subject,\n\s*html: customerEmailData\.html,\n\s*text: customerEmailData\.text,\n\s*\}\)/g;

const replacement = `sendMailWithRetry({
          from: '"DBUY Store" <support@dbuystore.com>',
          to: customerEmail,
          bcc: 'dbuystore.com+4f18ff2f22@invite.trustpilot.com',
          subject: customerEmailData.subject,
          html: customerEmailData.html,
          text: customerEmailData.text,
        })`;

serverContent = serverContent.replace(regex, replacement);

fs.writeFileSync('server.ts', serverContent);
