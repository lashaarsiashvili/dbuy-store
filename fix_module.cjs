const fs = require('fs');
let content = fs.readFileSync('src/components/ProductPaymentModule.tsx', 'utf8');

const regex = /\/\/ Execute verified Apple Pay payment authorization[\s\S]*?\/\/ Handle Google Pay Checkout with Direct Verified Authorization\n  const handleGooglePaySubmit = \(\) => {\n    executeGooglePayPayment\(\);\n  };\n/m;

const replacement = `// Execute verified Apple Pay payment authorization
  const handleApplePaySubmit = async () => {
    setIsProcessing(true);
    setGatewayMessage(isKa ? "Apple Pay ავტორიზაცია..." : "Authorizing Apple Pay...");
    try {
      await startPayPalV6ApplePayCheckout({
        amountUSD: totalAmountUSD,
        label: "DBUY Store Checkout",
        customerInfo: {
          name: walletCustomerName,
          email: walletCustomerEmail,
          address: walletAddress,
          city: walletCity,
          zip: walletZip,
          country: walletCountry
        },
        onSuccess: (details) => {
          setIsProcessing(false);
          setGatewayMessage("");
          handleCompleteOrder("applepay", details.transactionId || \`APAY-\${Date.now()}\`, {
            name: details.payer?.name || walletCustomerName,
            email: details.payer?.email || walletCustomerEmail,
            address: details.payer?.address || walletAddress,
            city: details.payer?.city || walletCity,
            zip: details.payer?.zip || walletZip,
            country: details.payer?.country || walletCountry
          });
          addToast(isKa ? " Apple Pay გადახდა წარმატებით შესრულდა!" : " Apple Pay authorized successfully!", "success");
        },
        onError: (err) => {
          setIsProcessing(false);
          setGatewayMessage("");
          console.error("Apple Pay error:", err);
          addToast(isKa ? "Apple Pay ავტორიზაცია ვერ მოხერხდა" : "Apple Pay payment failed", "error");
        },
        onCancel: () => {
          setIsProcessing(false);
          setGatewayMessage("");
        }
      });
    } catch(err) {
      setIsProcessing(false);
      setGatewayMessage("");
    }
  };

  // Execute verified Google Pay payment authorization
  const handleGooglePaySubmit = async () => {
    setIsProcessing(true);
    setGatewayMessage(isKa ? "Google Pay ავტორიზაცია..." : "Authorizing Google Pay...");
    try {
      await startPayPalV6GooglePayCheckout({
        amountUSD: totalAmountUSD,
        label: "DBUY Store Checkout",
        customerInfo: {
          name: walletCustomerName,
          email: walletCustomerEmail,
          address: walletAddress,
          city: walletCity,
          zip: walletZip,
          country: walletCountry
        },
        onSuccess: (orderID, details) => {
          setIsProcessing(false);
          setGatewayMessage("");
          handleCompleteOrder("googlepay", orderID || \`GPAY-\${Date.now()}\`, {
            name: details?.payer?.name || walletCustomerName,
            email: details?.payer?.email || walletCustomerEmail,
            address: details?.payer?.address || walletAddress,
            city: details?.payer?.city || walletCity,
            zip: details?.payer?.zip || walletZip,
            country: details?.payer?.country || walletCountry
          });
          addToast(isKa ? "Google Pay გადახდა წარმატებით შესრულდა!" : "Google Pay processed successfully!", "success");
        },
        onError: (err) => {
          setIsProcessing(false);
          setGatewayMessage("");
          console.error("Google Pay authorization error:", err);
          addToast(isKa ? "Google Pay გადახდა ვერ განხორციელდა" : "Google Pay payment failed", "error");
        },
        onCancel: () => {
          setIsProcessing(false);
          setGatewayMessage("");
        }
      });
    } catch(err) {
      setIsProcessing(false);
      setGatewayMessage("");
    }
  };
`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/ProductPaymentModule.tsx', content);
