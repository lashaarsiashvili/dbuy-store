const fs = require('fs');
let content = fs.readFileSync('src/components/ProductPaymentModule.tsx', 'utf8');

const regex4 = /const executeApplePayPayment = async \(\) => {[\s\S]*?};/m;
content = content.replace(regex4, `const executeApplePayPayment = async () => {
    setIsProcessing(true);
    setGatewayMessage(isKa ? "Apple Pay ავტორიზაცია და გადახდის დადასტურება..." : "Authorizing Apple Pay...");
    try {
      await startPayPalV6ApplePayCheckout({
        amountUSD: totalAmountUSD,
        label: "DBUY Store Checkout",
        customerInfo: { name: "", email: "", address: "", city: "", zip: "", country: "" },
        onSuccess: (details) => {
          setIsProcessing(false);
          addToast(isKa ? "Apple Pay გადახდა წარმატებით შესრულდა!" : "Apple Pay payment completed!", "success");
        },
        onError: (err) => {
          setIsProcessing(false);
          console.error("Apple Pay error:", err);
          addToast(isKa ? "Apple Pay გადახდა ვერ განხორციელდა" : "Apple Pay payment failed", "error");
        },
        onCancel: () => {
          setIsProcessing(false);
          addToast(isKa ? "Apple Pay გაუქმდა" : "Apple Pay cancelled", "warning");
        }
      });
    } catch(err) {
      setIsProcessing(false);
    }
  };`);

fs.writeFileSync('src/components/ProductPaymentModule.tsx', content);
