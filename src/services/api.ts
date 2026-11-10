import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_URL = 'https://kuzen.web.id/api';

const api = axios.create({
  baseURL: DEFAULT_API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 35000,
  withCredentials: Platform.OS !== 'web',
});

// Interceptor untuk menyematkan Auth Token jika tersedia
api.interceptors.request.use(
  async (config: any) => {
    try {
      const token = await AsyncStorage.getItem('@kuzen_auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Gagal mengambil token dari AsyncStorage:', error);
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Interceptor untuk menangani error global, cold-start retry, dan 401
api.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    config.__retryCount = config.__retryCount || 0;

    const isTransientError =
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout') ||
      error.message?.includes('Network Error') ||
      (error.response && [500, 502, 503, 504].includes(error.response.status));

    const isGetRequest = !config.method || config.method.toUpperCase() === 'GET';

    if (isGetRequest && isTransientError && config.__retryCount < 2) {
      config.__retryCount += 1;
      const delay = config.__retryCount * 1200;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
