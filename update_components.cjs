const fs = require('fs');

// Update ProductPaymentModule.tsx
let ppmContent = fs.readFileSync('src/components/ProductPaymentModule.tsx', 'utf8');

ppmContent = ppmContent.replace(
  `onError: (err) => {
          setIsProcessing(false);
          setGatewayMessage("");
          console.error("Apple Pay error:", err);
          addToast(isKa ? "Apple Pay ავტორიზაცია ვერ მოხერხდა" : "Apple Pay payment failed", "error");
        },`,
  `onError: (err) => {
          setIsProcessing(false);
          setGatewayMessage("");
          console.warn("Apple Pay notice:", err);
          const msg = err?.message || "";
          if (msg.includes("not supported") || msg.includes("not active")) {
            addToast(
              isKa
                ? " Apple Pay არ არის მხარდაჭერილი ამ მოწყობილობაზე/ბრაუზერში. გთხოვთ გამოიყენოთ Safari ან საბანკო ბარათი / PayPal."
                : " Apple Pay is not supported on this browser/device. Please use Safari on Apple device or Card / PayPal.",
              "info"
            );
          } else {
            addToast(isKa ? "Apple Pay ავტორიზაცია ვერ მოხერხდა" : "Apple Pay payment failed", "error");
          }
        },`
);

ppmContent = ppmContent.replace(
  `onError: (err) => {
          setIsProcessing(false);
          setGatewayMessage("");
          console.error("Google Pay authorization error:", err);
          addToast(isKa ? "Google Pay გადახდა ვერ განხორციელდა" : "Google Pay payment failed", "error");
        },`,
  `onError: (err) => {
          setIsProcessing(false);
          setGatewayMessage("");
          console.warn("Google Pay notice:", err);
          const msg = err?.message || "";
          if (msg.includes("not supported") || msg.includes("not active") || msg.includes("not available")) {
            addToast(
              isKa
                ? "Google Pay არ არის გააქტიურებული ამ ბრაუზერში. გთხოვთ გამოიყენოთ საბანკო ბარათი ან PayPal."
                : "Google Pay is not available on this browser/device. Please use Card or PayPal.",
              "info"
            );
          } else {
            addToast(isKa ? "Google Pay გადახდა ვერ განხორციელდა" : "Google Pay payment failed", "error");
          }
        },`
);

fs.writeFileSync('src/components/ProductPaymentModule.tsx', ppmContent);

// Update CheckoutModal.tsx
let cmContent = fs.readFileSync('src/components/CheckoutModal.tsx', 'utf8');

cmContent = cmContent.replace(
  `onError: (err) => {
          setIsProcessingPayment(false);
          console.warn("[CHECKOUT-APPLEPAY] PayPal v6 Apple Pay error:", err);
          addToast(
            language === "ka"
              ? "Apple Pay-ის დაწყება ვერ მოხერხდა. გთხოვთ გამოიყენოთ საბანკო ბარათი ან PayPal."
              : "Apple Pay session could not be completed. Please use Card or PayPal.",
            "info"
          );
        },`,
  `onError: (err) => {
          setIsProcessingPayment(false);
          console.warn("[CHECKOUT-APPLEPAY] PayPal v6 Apple Pay notice:", err);
          const msg = err?.message || "";
          if (msg.includes("not supported") || msg.includes("not active")) {
            addToast(
              language === "ka"
                ? " Apple Pay არ არის მხარდაჭერილი ამ მოწყობილობაზე/ბრაუზერში. გთხოვთ გამოიყენოთ Safari ან საბანკო ბარათი / PayPal."
                : " Apple Pay is not supported on this browser/device. Please use Safari or Card / PayPal.",
              "info"
            );
          } else {
            addToast(
              language === "ka"
                ? "Apple Pay-ის დაწყება ვერ მოხერხდა. გთხოვთ გამოიყენოთ საბანკო ბარათი ან PayPal."
                : "Apple Pay session could not be completed. Please use Card or PayPal.",
              "info"
            );
          }
        },`
);

cmContent = cmContent.replace(
  `onError: (err) => {
          setIsProcessingPayment(false);
          console.error("Google Pay authorization error:", err);
          addToast(
            language === "ka"
              ? "Google Pay გადახდა ვერ განხორციელდა"
              : "Google Pay payment failed",
            "error"
          );
        },`,
  `onError: (err) => {
          setIsProcessingPayment(false);
          console.warn("[CHECKOUT-GOOGLEPAY] Google Pay notice:", err);
          const msg = err?.message || "";
          if (msg.includes("not supported") || msg.includes("not active") || msg.includes("not available")) {
            addToast(
              language === "ka"
                ? "Google Pay არ არის გააქტიურებული ამ ბრაუზერში. გთხოვთ გამოიყენოთ საბანკო ბარათი ან PayPal."
                : "Google Pay is not available on this browser/device. Please use Card or PayPal.",
              "info"
            );
          } else {
            addToast(
              language === "ka"
                ? "Google Pay გადახდა ვერ განხორციელდა"
                : "Google Pay payment failed",
              "error"
            );
          }
        },`
);

fs.writeFileSync('src/components/CheckoutModal.tsx', cmContent);
