import axios from "axios";
import { marketplaceUrl } from "../config/index.js";
import { getUserToken } from "./authHelper.js";

/**
 * Function to create an Axios API client
 * @param {string} baseURL - The base URL for the API
 * @returns {AxiosInstance} Configured Axios client
 */
/**
 * Interface for API client configuration
 */
interface ApiClientConfig {
  baseURL: string;
  headers: Record<string, string>;
  timeout: number;
}

/**
 * Function to create an Axios API client
 * @param {string} baseURL - The base URL for the API
 * @returns {AxiosInstance} Configured Axios client
 */
const createApiClient = (baseURL: string): import("axios").AxiosInstance => {
  const client = axios.create({
    baseURL,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 60000, // Timeout set to 60 seconds
  } as ApiClientConfig);

  // Request interceptor to attach Authorization token
  client.interceptors.request.use(
    async (config: import("axios").InternalAxiosRequestConfig) => {
      try {
        const token = await getUserToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      } catch (error: any) {
        console.error(`Failed to attach Authorization token: ${error.message}`);
        return Promise.reject(error);
      }
    },
    (error: any) => {
      console.error(`API Request Error: ${error.message}`);
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle and log errors
  client.interceptors.response.use(
    (response: import("axios").AxiosResponse) => response,
    (error: any) => {
      if (error.response) {
        console.error(
          `API Response Error [${error.response.status}]: ${error.response.statusText}`
        );
      } else {
        console.error(`API Network Error: ${error.message}`);
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// Initialize API clients
const networkApiClient = createApiClient(
  `https://marketplace.mercata.blockapps.net/strato/v2.3`
);
const dbApiClient = createApiClient(
  `https://marketplace.mercata.blockapps.net/cirrus/search`
);

export { networkApiClient, dbApiClient };
