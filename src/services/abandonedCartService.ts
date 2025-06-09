
export interface CreateAbandonedCartPayload {
  customerName?: string;
  customerEmail: string;
  customerWhatsapp: string;
  productId: string;
  productName: string;
  potentialValueInCents: number;
}
