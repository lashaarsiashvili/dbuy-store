const fs = require('fs');

let productPayment = fs.readFileSync('src/components/ProductPaymentModule.tsx', 'utf8');
productPayment = productPayment.replace(
  /onClick=\{handleGooglePaySubmit\}/g,
  `amount={totalAmountUSD}
              currencyCode="GEL"
              onSuccess={(paymentData) => {
                const orderID = "GPAY-" + Date.now();
                setIsProcessing(false);
                setGatewayMessage("");
                handleCompleteOrder("googlepay", orderID, {
                  name: walletCustomerName,
                  email: walletCustomerEmail,
                  address: walletAddress,
                  city: walletCity,
                  zip: walletZip,
                  country: walletCountry
                });
              }}
              onError={(err) => {
                setIsProcessing(false);
                addToast(isKa ? "Google Pay-ით გადახდა ვერ მოხერხდა" : "Google Pay failed", "error");
              }}`
);
fs.writeFileSync('src/components/ProductPaymentModule.tsx', productPayment);

let checkoutModal = fs.readFileSync('src/components/CheckoutModal.tsx', 'utf8');
checkoutModal = checkoutModal.replace(
  /onClick=\{handleGooglePaySubmit\}/g,
  `amount={totalAmountUSD}
                    currencyCode="GEL"
                    onSuccess={(paymentData) => {
                      const orderID = "GPAY-" + Date.now();
                      setIsProcessingPayment(false);
                      placeOrder({
                        customerName: formData.name.trim(),
                        email: formData.email.trim(),
                        address: formData.address.trim(),
                        city: formData.city.trim(),
                        zip: formData.zip.trim(),
                        country: formData.country.trim(),
                        paymentMethod: "googlepay",
                        googlePayTransactionId: orderID,
                      });
                      setStep(3);
                      addToast(
                        language === "ka"
                          ? "Google Pay გადახდა წარმატებით შესრულდა!"
                          : "Google Pay processed successfully!",
                        "success"
                      );
                    }}
                    onError={(err) => {
                      setIsProcessingPayment(false);
                      addToast(language === "ka" ? "Google Pay გადახდა ვერ მოხერხდა" : "Google Pay failed", "error");
                    }}`
);
fs.writeFileSync('src/components/CheckoutModal.tsx', checkoutModal);

console.log('Patched');
