
import {
  PushInPayPixRequest,
  PushInPayPixResponse,
  PushInPayPixResponseData,
  PaymentStatus,
  PushInPayTransactionStatusResponse,
  PushInPayTransactionStatusData,
  SaleProductItem
} from '../types';
import { PUSHINPAY_API_BASE } from '../constants';

// Variável para simular se o pagamento foi bem-sucedido no polling
let simulatedPaymentSuccess = false;
let simulatedPaymentAttempts = 0;

export const pushInPayService = {
  generatePixCharge: async (
    payload: PushInPayPixRequest,
    apiToken: string,
    enabled: boolean
  ): Promise<PushInPayPixResponse> => {
    console.log("PushInPayService: generatePixCharge called with payload:", payload, "enabled:", enabled, "token:", apiToken ? "******" : "NO TOKEN");

    if (!enabled) {
      return { success: false, message: "Integração PushInPay desabilitada pelo usuário." };
    }
    if (!apiToken) {
      return { success: false, message: "Token da API PushInPay não configurado." };
    }

    // Simulate API call to PushInPay
    // In a real scenario, this would be:
    // const response = await fetch(`${PUSHINPAY_API_BASE}/pix/charge`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiToken}` },
    //   body: JSON.stringify(payload)
    // });
    // const responseData = await response.json();
    // For now, simulate a successful response structure
    
    // Reset simulation for new charge
    simulatedPaymentSuccess = false;
    simulatedPaymentAttempts = 0;
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    const mockPixId = `mock_pushinpay_pix_${Date.now()}`;
    const pixData: PushInPayPixResponseData = {
      id: mockPixId,
      qr_code: `MOCK_QR_CODE_FOR_${mockPixId}`,
      qr_code_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Placeholder 1x1 black pixel
      status: PaymentStatus.WAITING_PAYMENT,
      value: payload.value
    };
    
    console.log("PushInPayService: Simulated PIX Charge generation for PushInPay:", pixData);
    return {
      success: true,
      data: pixData,
      message: "Cobrança PIX gerada (simulação)."
    };
  },

  checkPaymentStatus: async (
    transactionId: string,
    apiToken: string,
    enabled: boolean
  ): Promise<PushInPayTransactionStatusResponse> => {
    console.log("PushInPayService: checkPaymentStatus called for transactionId:", transactionId, "enabled:", enabled, "token:", apiToken ? "******" : "NO TOKEN");
    
    if (!enabled) {
      return { success: false, message: "Integração PushInPay desabilitada (verificação de status)." };
    }
    if (!apiToken) {
      return { success: false, message: "Token da API PushInPay não configurado (verificação de status)." };
    }

    // Simulate API call
    // const response = await fetch(`${PUSHINPAY_API_BASE}/pix/transaction/${transactionId}`, {
    //   headers: { 'Authorization': `Bearer ${apiToken}` }
    // });
    // const responseData = await response.json();

    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    simulatedPaymentAttempts++;
    // Simulate payment success after a few attempts (e.g., 3rd attempt)
    if (!simulatedPaymentSuccess && simulatedPaymentAttempts >= 3) {
        simulatedPaymentSuccess = true;
    }
    
    const statusData: PushInPayTransactionStatusData = {
        id: transactionId,
        status: simulatedPaymentSuccess ? PaymentStatus.PAID : PaymentStatus.WAITING_PAYMENT,
        value: 1000, // Placeholder value, ideally this comes from the initial charge.
        paid_at: simulatedPaymentSuccess ? new Date().toISOString() : undefined
    };
    
    console.log("PushInPayService: Simulated payment status for PushInPay:", statusData);
    return {
      success: true,
      data: statusData,
      message: "Status do pagamento verificado (simulação)."
    };
  }
};
