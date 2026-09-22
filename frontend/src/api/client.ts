export interface HealthCheckResponse {
  status: "healthy" | "degraded" | string;
  service: string;
  timestamp: string;
  database: string;
  cache: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function fetchHealthCheck(): Promise<HealthCheckResponse> {
  const url = `${API_BASE_URL}/api/health/`;
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Health check request failed with status: ${response.status}`);
  }

  return response.json();
}
