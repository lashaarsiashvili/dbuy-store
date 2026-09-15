export const triggerTrustpilotInvitation = (orderId: string, email: string, name: string, items: any[]) => {
  if (typeof window === 'undefined' || !(window as any).tp) return;
  
  try {
    const trustpilot_invitation = {
      recipientEmail: email || 'customer@example.com',
      recipientName: name || 'Customer',
      referenceId: orderId || `Order_${Date.now()}`,
      source: 'InvitationScript',
      productSkus: items.map(i => String(i.id)),
      products: items.map(i => ({
        sku: String(i.id),
        productUrl: window.location.origin + `/product/${i.id}`,
        imageUrl: i.image ? (i.image.startsWith('http') ? i.image : window.location.origin + i.image) : '',
        name: i.name || 'Product',
      })),
    };
    (window as any).tp('createInvitation', trustpilot_invitation);
    console.log('Trustpilot invitation sent:', trustpilot_invitation);
  } catch (e) {
    console.error('Trustpilot error:', e);
  }
};
