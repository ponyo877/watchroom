import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export const axiosInstance = axios.create({
  baseURL: '', // Use relative URLs to go through Vite proxy
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      config.headers['X-User-Id'] = userId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized');
    }
    return Promise.reject(error);
  }
);

export const customInstance = <T>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  return axiosInstance(config);
};

export default axiosInstance;
