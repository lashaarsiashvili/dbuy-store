const fs = require('fs');
let content = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

const replacement = `  const handleRegStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegStep(2);
  };
  const handleRegStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRegisterSubmit(e);
  };

  const handleTabSwitch = (newTab: "login" | "register") => {`;

content = content.replace(/  const handleTabSwitch = \(newTab: "login" \| "register"\) => {/, replacement);
fs.writeFileSync('src/components/AuthModal.tsx', content);
