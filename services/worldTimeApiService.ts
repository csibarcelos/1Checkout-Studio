// services/worldTimeApiService.ts

interface WorldTimeApiResponse {
  utc_datetime: string;
  timezone: string;
  client_ip: string;
  // ... outros campos
}

const WORLD_TIME_API_URL = 'https://worldtimeapi.org/api/timezone/America/Sao_Paulo';

interface WorldTimeInfo {
  utcDateTime: string | null;
  clientIp: string | null;
}

export const worldTimeApiService = {
  getWorldTimeInfo: async (): Promise<WorldTimeInfo> => {
    try {
      const response = await fetch(WORLD_TIME_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`WorldTimeAPI Error: ${response.status} - ${response.statusText}`);
        return { utcDateTime: null, clientIp: null };
      }

      const data: WorldTimeApiResponse = await response.json();
      if (data && data.utc_datetime && data.client_ip) {
        return {
          utcDateTime: data.utc_datetime, // Este já está em formato ISO8601 UTC
          clientIp: data.client_ip,
        };
      } else {
        console.error('WorldTimeAPI Error: Required fields (utc_datetime, client_ip) not found in response', data);
        return { utcDateTime: data?.utc_datetime || null, clientIp: null };
      }
    } catch (error) {
      console.error('WorldTimeAPI Error: Failed to fetch time or IP', error);
      return { utcDateTime: null, clientIp: null };
    }
  },
};