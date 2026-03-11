interface ClientConfig {
  googleMapsApiKey: string;
  googleMapId: string;
}

let cachedClientConfig: ClientConfig | null = null;

export function getClientConfig(): ClientConfig {
  if (cachedClientConfig) {
    return cachedClientConfig;
  }

  cachedClientConfig = {
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "",
    googleMapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID?.trim() || "",
  };

  return cachedClientConfig;
}
