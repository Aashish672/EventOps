export interface HealthCheckResponse {
  status: "healthy" | "degraded" | string;
  service: string;
  timestamp: string;
  database: string;
  cache: string;
}

import { API_BASE_URL } from "./core";

export async function fetchHealthCheck(): Promise<HealthCheckResponse> {
  const url = `${API_BASE_URL}/api/health/`;
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch (networkErr) {
    throw new Error(
      `Cannot connect to backend server. Ensure Django is running on port 8000 (${
        networkErr instanceof Error ? networkErr.message : "Network error"
      })`
    );
  }

  // 503 Service Unavailable is a valid structured health response from HealthCheckView
  if (response.status === 503) {
    const degradedData = await response.json().catch(() => null);
    if (degradedData && degradedData.status) {
      return degradedData;
    }
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Backend health check failed with status HTTP ${response.status}${
        errorText ? `: ${errorText.slice(0, 120)}` : ""
      }`
    );
  }

  return response.json();
}
