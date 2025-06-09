
import {
  PushInPayPixRequest,
  PushInPayPixResponse,
  PushInPayPixResponseData,
  PaymentStatus,
  PushInPayTransactionStatusResponse,
  PushInPayTransactionStatusData,
  SaleProductItem
} from '../types'; // Corrected path

const transactionCheckCounts: Record<string, number> = {};

// Default error data structures to ensure type safety
const defaultErrorPixData: PushInPayPixResponseData = {
  id: '', qr_code: '', qr_code_base64: '', status: PaymentStatus.FAILED, value: 0
};

const defaultErrorStatusData: PushInPayTransactionStatusData = {
    id: '', status: PaymentStatus.FAILED, value: 0
};

// A more visible placeholder QR Code (SVG base64 encoded)
const mockQrCodeBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ3aGl0ZSIvPgo8cmVjdCB4PSIzMCIgeT0iMzAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iODAiIHk9IjMwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjEwMCIgeT0iMzAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMTIwIiB5PSIzMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIxNDAiIHk9IjMwIiB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjMwIiB5PSI4MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIzMCIgeT0iMTIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMzAiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjUwIiB5PSI4MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSI1MCIgeT0iMTAwIiB3aWR0aD0iMzAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjUwIiB5PSIxNDAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iODAiIHk9IjUwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjgwIiB5PSI3MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjMwIiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSI4MCIgeT0iMTIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjEwMCIgeT0iNTAiIHdpZHRoPSIzMCIgaGVpZ2h0PSIxMCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMTAwIiB5PSI4MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIxMDAiIHk9IjEwMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIxMDAiIHk9IjEzMCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIxMzAiIHk9IjMwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjEzMCIgeT0iNzAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMTMwIiB5PSIxMDAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIzMCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iMTQwIiB5PSI4MCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIxNDAiIHk9IjEyMCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIxNjAiIHk9IjUwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjE2MCIgeT0iMTQwIiB3aWR0aD0iMTAiIGhlaWdodD0iMzAiIGZpbGw9ImJsYWNrIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTkwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9ImJsYWNrIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Nb2NrIFBJWCBRUiBDb2RlPC90ZXh0Pgo8L3N2Zz4=';

export const pushinPayService = {
  generatePixCharge: async (
    payload: PushInPayPixRequest,
    apiToken: string,
    enabled: boolean,
    _platformCommissionPercentage: number, 
    _platformFixedFeeInCents: number,
    _platformAccountIdPushInPay: string
  ): Promise<PushInPayPixResponse> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!enabled) {
          console.warn("Mock PushInPay Service: Integration disabled.");
          resolve({ success: false, message: "Integração PushInPay desabilitada.", data: defaultErrorPixData });
          return;
        }
        if (!apiToken) {
          console.warn("Mock PushInPay Service: API Token not provided.");
          resolve({ success: false, message: "Token da API PushInPay não configurado.", data: defaultErrorPixData });
          return;
        }

        console.log("Mock PushInPay Service: Generating PIX charge", { payload, apiToken, enabled });

        const responseData: PushInPayPixResponseData = {
          id: `pix_mock_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
          qr_code: 'mock_qr_code_string_from_pushinpay_service_updated_again',
          qr_code_base64: mockQrCodeBase64, // Using the new visible placeholder
          status: PaymentStatus.WAITING_PAYMENT,
          value: payload.value 
        };
        resolve({ success: true, data: responseData, message: "PIX gerado com sucesso (mock)." });
      }, 100);
    });
  },

  checkPaymentStatus: async (
    transactionId: string,
    apiToken: string,
    enabled: boolean
  ): Promise<PushInPayTransactionStatusResponse> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!enabled) {
          console.warn("Mock PushInPay Service: Integration disabled (status check).");
          resolve({
            success: false,
            message: "Integração PushInPay desabilitada (status check).",
            data: {...defaultErrorStatusData, id: transactionId }
          });
          return;
        }
        if (!apiToken) {
          console.warn("Mock PushInPay Service: API Token not provided (status check).");
          resolve({
            success: false,
            message: "Token da API PushInPay não configurado (status check).",
            data: {...defaultErrorStatusData, id: transactionId }
          });
          return;
        }

        console.log("Mock PushInPay Service: Checking payment status for", transactionId);

        transactionCheckCounts[transactionId] = (transactionCheckCounts[transactionId] || 0) + 1;

        let mappedStatus: PaymentStatus = PaymentStatus.WAITING_PAYMENT;
        let paidAt: string | undefined = undefined;
        
        if (transactionCheckCounts[transactionId] >= 2) { 
          mappedStatus = PaymentStatus.PAID;
          paidAt = new Date().toISOString();
          console.log(`PushInPayService Mock: Transaction ${transactionId} marked as PAID on check #${transactionCheckCounts[transactionId]}.`);
        } else {
          console.log(`PushInPayService Mock: Transaction ${transactionId} is WAITING_PAYMENT on check #${transactionCheckCounts[transactionId]}.`);
        }
        
        const originalTransaction = (globalThis as any).mockPixTransactionsStore?.find((t: any) => t.id === transactionId);
        const valueForResponse = originalTransaction ? originalTransaction.valueInCents : 0;


        const responseData: PushInPayTransactionStatusData = {
          id: transactionId,
          status: mappedStatus,
          value: valueForResponse, 
          paid_at: paidAt 
        };

        resolve({ success: true, data: responseData, message: `Status verificado (mock): ${mappedStatus}` });
      }, 100);
    });
  }
};
