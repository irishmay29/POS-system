import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/',
  headers: { 'Content-Type': 'application/json' },
});

// simple request logger for debugging failing requests
instance.interceptors.request.use((config) => {
  // eslint-disable-next-line no-console
  console.debug('[api] Request:', config.method?.toUpperCase(), config.baseURL + config.url);
  return config;
});

let accessToken = null;
let refreshToken = null;
let isRefreshing = false;
let refreshQueue = [];

function setTokens(at, rt) {
  accessToken = at;
  refreshToken = rt;
}

function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

// attach token
// token attachment
instance.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// response interceptor to handle 401 and refresh
instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response && err.response.status === 401 && !original._retry) {
      if (!refreshToken) return Promise.reject(err);
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return instance(original);
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const resp = await axios.post((process.env.REACT_APP_API_BASE_URL || '/') + 'auth/refresh', { refreshToken });
        const { token: newToken, refreshToken: newRefresh } = resp.data;
        setTokens(newToken, newRefresh);
        // notify queued
        refreshQueue.forEach(p => p.resolve(newToken));
        refreshQueue = [];
        isRefreshing = false;
        original.headers.Authorization = `Bearer ${newToken}`;
        return instance(original);
      } catch (e) {
        refreshQueue.forEach(p => p.reject(e));
        refreshQueue = [];
        isRefreshing = false;
        clearTokens();
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  }
);

export default {
  get: instance.get,
  post: instance.post,
  put: instance.put,
  delete: instance.delete,
  setTokens,
  clearTokens,
};
