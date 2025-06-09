
import { UtmifyOrderPayload, UtmifyResponse } from '../../types';

export const utmifyService = {
  sendOrderData: async (payload: UtmifyOrderPayload, apiToken: string): Promise<UtmifyResponse> => {
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Mock UTMify Service: Sending order data", { payload, apiToken });
        resolve({
          data: {
            utmifyTrackingId: `utm_${Date.now()}`
          },
          success: true,
          message: "Mock UTMify data sent successfully."
        });
      }, 100);
    });
  }
};
