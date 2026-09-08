const fs = require('fs');
let content = fs.readFileSync('src/components/CheckoutModal.tsx', 'utf8');

const regex = /const executeDirectApplePayAuthorization[\s\S]*?const handleGooglePaySubmit = \(\) => {[\s\S]*?};/m;

const replacement = `const handleApplePaySubmit = async () => {
    setIsProcessingPayment(true);
    try {
      await startPayPalV6ApplePayCheckout({
        amountUSD: totalAmountUSD,
        label: "DBUY Store Checkout",
        customerInfo: formData,
        onSuccess: (details) => {
          placeOrder({
            customerName: (details.payer?.name || formData.name).trim(),
            email: (details.payer?.email || formData.email).trim(),
            address: (details.payer?.address || formData.address).trim(),
            city: (details.payer?.city || formData.city).trim(),
            zip: (details.payer?.zip || formData.zip).trim(),
            country: (details.payer?.country || formData.country).trim(),
            paymentMethod: "applepay",
            applePayTransactionId: details.transactionId,
            paypalTransactionId: details.orderId || details.transactionId,
          });
          setIsProcessingPayment(false);
          setStep(3);
          addToast(
            language === "ka"
              ? " Apple Pay გადახდა წარმატებით შესრულდა!"
              : " Apple Pay authorized successfully!",
            "success",
          );
        },
        onError: (err) => {
          setIsProcessingPayment(false);
          console.warn("[CHECKOUT-APPLEPAY] PayPal v6 Apple Pay error:", err);
          addToast(
            language === "ka"
              ? "Apple Pay-ის დაწყება ვერ მოხერხდა. გთხოვთ გამოიყენოთ საბანკო ბარათი ან PayPal."
              : "Apple Pay session could not be completed. Please use Card or PayPal.",
            "info",
          );
        },
        onCancel: () => {
          setIsProcessingPayment(false);
        },
      });
    } catch (e) {
      setIsProcessingPayment(false);
      addToast(
        language === "ka"
          ? "Apple Pay-ის დაწყება ვერ მოხერხდა. გთხოვთ გამოიყენოთ საბანკო ბარათი ან PayPal."
          : "Apple Pay session could not be started. Please use Card or PayPal below.",
        "info",
      );
    }
  };

  const handleGooglePaySubmit = async () => {
    setIsProcessingPayment(true);
    try {
      await startPayPalV6GooglePayCheckout({
        amountUSD: totalAmountUSD,
        label: "DBUY Store Checkout",
        customerInfo: formData,
        onSuccess: (orderID, details) => {
          setIsProcessingPayment(false);
          placeOrder({
            customerName: (details?.payer?.name || formData.name).trim(),
            email: (details?.payer?.email || formData.email).trim(),
            address: (details?.payer?.address || formData.address).trim(),
            city: (details?.payer?.city || formData.city).trim(),
            zip: (details?.payer?.zip || formData.zip).trim(),
            country: (details?.payer?.country || formData.country).trim(),
            paymentMethod: "googlepay",
            googlePayTransactionId: orderID,
            paypalTransactionId: orderID,
          });
          setStep(3);
          addToast(
            language === "ka"
              ? "Google Pay გადახდა წარმატებით შესრულდა!"
              : "Google Pay processed successfully!",
            "success",
          );
        },
        onError: (err) => {
          setIsProcessingPayment(false);
          console.error("Google Pay authorization error:", err);
          addToast(
            language === "ka"
              ? "Google Pay გადახდა ვერ განხორციელდა"
              : "Google Pay payment failed",
            "error",
          );
        },
        onCancel: () => {
          setIsProcessingPayment(false);
          addToast(
            language === "ka" ? "Google Pay გადახდა გაუქმდა" : "Google Pay payment cancelled",
            "warning"
          );
        }
      });
    } catch(err) {
      setIsProcessingPayment(false);
    }
  };`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/CheckoutModal.tsx', content);
