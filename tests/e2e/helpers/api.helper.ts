import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { TEST_CONFIG } from '../playwright.config';
import { AuthHelper, TokenStorage } from './auth.helper';

/**
 * API Response wrapper with typed data
 */
export interface ApiResponseWrapper<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  headers: Record<string, string>;
}

/**
 * Paginated response from the API
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Error response from the API
 */
export interface ErrorResponse {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  quota_type?: string;
  current_usage?: number;
  limit?: number;
}

/**
 * API helper class for making authenticated requests
 */
export class ApiHelper {
  private apiContext: APIRequestContext | null = null;
  private baseUrl: string;
  private apiPrefix: string;
  private token: string | null = null;
  private academyId: string | null = null;

  constructor(baseUrl?: string) {
    // Extract the origin and API prefix from the full URL
    const fullUrl = baseUrl || TEST_CONFIG.API_BASE_URL;
    const url = new URL(fullUrl);
    this.baseUrl = url.origin; // e.g., http://localhost:8000
    this.apiPrefix = url.pathname.replace(/\/$/, ''); // e.g., /api/v1
  }

  /**
   * Initialize the API context
   */
  async init(): Promise<void> {
    this.apiContext = await request.newContext({
      baseURL: this.baseUrl,
      extraHTTPHeaders: {
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Cleanup the API context
   */
  async dispose(): Promise<void> {
    if (this.apiContext) {
      await this.apiContext.dispose();
      this.apiContext = null;
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Set academy context
   */
  setAcademyId(academyId: string | null): void {
    this.academyId = academyId;
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.token = null;
    this.academyId = null;
  }

  /**
   * Set authentication from token storage
   */
  setAuth(tokenStorage: TokenStorage): void {
    this.token = tokenStorage.accessToken;
    if (tokenStorage.user.academy_id) {
      this.academyId = tokenStorage.user.academy_id;
    }
  }

  /**
   * Get headers for requests
   */
  private getHeaders(overrideAcademyId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const academyId = overrideAcademyId !== undefined ? overrideAcademyId : this.academyId;
    if (academyId) {
      headers['X-Academy-ID'] = academyId;
    }

    return headers;
  }

  /**
   * Parse API response
   */
  private async parseResponse<T>(response: APIResponse): Promise<ApiResponseWrapper<T>> {
    let data: T;
    try {
      data = await response.json();
    } catch {
      data = (await response.text()) as unknown as T;
    }

    // Playwright's response.headers() returns an object, not a Map
    const headers: Record<string, string> = response.headers();

    return {
      status: response.status(),
      ok: response.ok(),
      data,
      headers,
    };
  }

  /**
   * Get full URL with API prefix
   */
  private getFullUrl(url: string): string {
    // If URL already starts with /api, use it as-is
    if (url.startsWith('/api/')) {
      return url;
    }
    // Otherwise prepend the API prefix
    return `${this.apiPrefix}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(
    url: string,
    options?: {
      token?: string;
      academyId?: string;
      params?: Record<string, string | number | boolean>;
    }
  ): Promise<ApiResponseWrapper<T>> {
    if (!this.apiContext) {
      await this.init();
    }

    if (options?.token) {
      this.setToken(options.token);
    }

    const headers = this.getHeaders(options?.academyId);
    
    const response = await this.apiContext!.get(this.getFullUrl(url), {
      headers,
      params: options?.params,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: {
      token?: string;
      academyId?: string;
    }
  ): Promise<ApiResponseWrapper<T>> {
    if (!this.apiContext) {
      await this.init();
    }

    if (options?.token) {
      this.setToken(options.token);
    }

    const headers = this.getHeaders(options?.academyId);

    const response = await this.apiContext!.post(this.getFullUrl(url), {
      headers,
      data,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Make a PATCH request
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: {
      token?: string;
      academyId?: string;
    }
  ): Promise<ApiResponseWrapper<T>> {
    if (!this.apiContext) {
      await this.init();
    }

    if (options?.token) {
      this.setToken(options.token);
    }

    const headers = this.getHeaders(options?.academyId);

    const response = await this.apiContext!.patch(this.getFullUrl(url), {
      headers,
      data,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: {
      token?: string;
      academyId?: string;
    }
  ): Promise<ApiResponseWrapper<T>> {
    if (!this.apiContext) {
      await this.init();
    }

    if (options?.token) {
      this.setToken(options.token);
    }

    const headers = this.getHeaders(options?.academyId);

    const response = await this.apiContext!.put(this.getFullUrl(url), {
      headers,
      data,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(
    url: string,
    options?: {
      token?: string;
      academyId?: string;
    }
  ): Promise<ApiResponseWrapper<T>> {
    if (!this.apiContext) {
      await this.init();
    }

    if (options?.token) {
      this.setToken(options.token);
    }

    const headers = this.getHeaders(options?.academyId);

    const response = await this.apiContext!.delete(this.getFullUrl(url), {
      headers,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Upload a file
   */
  async uploadFile<T = unknown>(
    url: string,
    file: {
      name: string;
      mimeType: string;
      buffer: Buffer;
    },
    additionalData?: Record<string, string>,
    options?: {
      token?: string;
      academyId?: string;
    }
  ): Promise<ApiResponseWrapper<T>> {
    if (!this.apiContext) {
      await this.init();
    }

    if (options?.token) {
      this.setToken(options.token);
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const academyId = options?.academyId !== undefined ? options.academyId : this.academyId;
    if (academyId) {
      headers['X-Academy-ID'] = academyId;
    }

    const response = await this.apiContext!.post(this.getFullUrl(url), {
      headers,
      multipart: {
        file: {
          name: file.name,
          mimeType: file.mimeType,
          buffer: file.buffer,
        },
        ...additionalData,
      },
    });

    return this.parseResponse<T>(response);
  }
}

/**
 * Create a new API helper instance
 */
export function createApiHelper(baseUrl?: string): ApiHelper {
  return new ApiHelper(baseUrl);
}

/**
 * Convenience functions for quick API calls
 */
export async function apiGet<T = unknown>(
  url: string,
  token: string,
  academyId?: string
): Promise<ApiResponseWrapper<T>> {
  const helper = createApiHelper();
  await helper.init();
  try {
    return await helper.get<T>(url, { token, academyId });
  } finally {
    await helper.dispose();
  }
}

export async function apiPost<T = unknown>(
  url: string,
  data: unknown,
  token: string,
  academyId?: string
): Promise<ApiResponseWrapper<T>> {
  const helper = createApiHelper();
  await helper.init();
  try {
    return await helper.post<T>(url, data, { token, academyId });
  } finally {
    await helper.dispose();
  }
}

export async function apiPatch<T = unknown>(
  url: string,
  data: unknown,
  token: string,
  academyId?: string
): Promise<ApiResponseWrapper<T>> {
  const helper = createApiHelper();
  await helper.init();
  try {
    return await helper.patch<T>(url, data, { token, academyId });
  } finally {
    await helper.dispose();
  }
}

export async function apiDelete<T = unknown>(
  url: string,
  token: string,
  academyId?: string
): Promise<ApiResponseWrapper<T>> {
  const helper = createApiHelper();
  await helper.init();
  try {
    return await helper.delete<T>(url, { token, academyId });
  } finally {
    await helper.dispose();
  }
}
