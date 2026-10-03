/**
 * Store-wide contact and enquiry configuration for Anant Electronics.
 */

export const STORE_CONTACT = {
  phone: "7726077261",
  displayPhone: "+91 77260 77261",
  whatsappNumber: "917726077261",
  storeName: "Anant Electronics",
  tagline: "Live Mobile Price, Offers & Customer Presentation",
};

/**
 * Builds standard WhatsApp enquiry link pre-filled with customer's model details.
 */
export function buildWhatsAppEnquiryUrl(text: string): string {
  return `https://wa.me/${STORE_CONTACT.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

/**
 * Direct tel: protocol link for phone calling.
 */
export function buildCallingUrl(): string {
  return `tel:${STORE_CONTACT.phone}`;
}
