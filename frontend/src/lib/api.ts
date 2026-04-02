import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'

const baseURL = import.meta.env.VITE_API_BASE_URL as string | undefined

export const api = axios.create({
  baseURL: baseURL || '',
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers = config.headers ?? {}
      ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status
    const data = error.response?.data as any
    let message = 'Request failed'
    
    if (!error.response) {
      message = 'Network error - is the backend running?'
    } else if (status === 401) {
      message = 'Unauthorized - please login again'
    } else if (status === 403) {
      message = 'Access denied'
    } else if (status === 422) {
      message = data?.detail || 'Validation error'
    } else if (status === 500) {
      message = 'Server error'
    } else {
      message = data?.message || data?.detail || error.message
    }
    
    console.error('API Error:', status, message, data)
    alert(message)
    return Promise.reject(error)
  },
)

export async function get<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const res = await api.get<T>(url, { params })
  return res.data
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const config = body instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}
  const res = await api.post<T>(url, body, config)
  return res.data
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<T>(url, body)
  return res.data
}

export async function del<T>(url: string): Promise<T> {
  const res = await api.delete<T>(url)
  return res.data
}

