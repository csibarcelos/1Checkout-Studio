
import { PushInPayPixRequest, PushInPayPixResponseData, PaymentStatus, SaleProductItem } from '../../types';

export const pushInPayService = {
  generatePixCharge: async (payload: PushInPayPixRequest, apiToken: string, enabled: boolean): Promise<PushInPayPixResponseData> => {
    // Mock implementation
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!enabled) {
          console.warn("Mock PushInPay Service: Integration disabled.");
          // Simulating a failure response structure similar to the original CheckoutPage error handling
          reject({ success: false, message: "Integração PushInPay desabilitada.", data: { id: '', qr_code: '', qr_code_base64: '', status: PaymentStatus.EXPIRED, value: 0 } });
          return;
        }
        if (!apiToken) {
          console.warn("Mock PushInPay Service: API Token not provided.");
          reject({ success: false, message: "Token da API PushInPay não configurado.", data: { id: '', qr_code: '', qr_code_base64: '', status: PaymentStatus.EXPIRED, value: 0 } });
          return;
        }
        
        console.log("Mock PushInPay Service: Generating PIX charge", { payload, apiToken, enabled });
        const value = payload.products.reduce((sum, p: SaleProductItem) => sum + (p.priceInCents * p.quantity), 0);
        resolve({
          id: `pix_mock_${Date.now()}`,
          qr_code: 'mock_qr_code_string_from_pushinpay_service',
          qr_code_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Placeholder 1x1 black pixel
          status: PaymentStatus.WAITING_PAYMENT,
          value: value
        });
      }, 100);
    });
  },

  checkPaymentStatus: async (transactionId: string, apiToken: string, enabled: boolean): Promise<{status: PaymentStatus}> => {
    // Mock implementation
    return new Promise((resolve, reject) => {
      setTimeout(() => {
         if (!enabled) {
          console.warn("Mock PushInPay Service: Integration disabled (status check).");
          // Simulating a failure response structure similar to original CheckoutPage
          reject({ success: false, message: "Integração PushInPay desabilitada (status check).", data: { id: transactionId, status: PaymentStatus.EXPIRED, value: 0 } });
          return;
        }
         if (!apiToken) {
          console.warn("Mock PushInPay Service: API Token not provided (status check).");
          reject({ success: false, message: "Token da API PushInPay não configurado (status check).", data: { id: transactionId, status: PaymentStatus.EXPIRED, value: 0 } });
          return;
        }
        console.log("Mock PushInPay Service: Checking payment status for", transactionId);
        // Simulate that payment is still pending for a while
        const isPaid = Math.random() > 0.8; // 20% chance of being paid on check
        resolve({
          status: isPaid ? PaymentStatus.PAID : PaymentStatus.WAITING_PAYMENT
        });
      }, 100);
    });
  }
};
