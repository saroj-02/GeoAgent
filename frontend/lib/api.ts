// Frontend API client for GeoAgent backend

import {
  getToken,
  setToken as setAuthToken,
  setRefreshToken as setAuthRefreshToken,
  logout as authLogout,
  refreshAccessToken,
} from "@/lib/auth";

import {
  AuthTokens,
  Device,
  LocationPoint,
  LocationHistory,
  LocationPermission,
  PermissionList,
  LoginRequest,
  RegisterRequest,
  CreateDeviceRequest,
  GrantPermissionRequest,
  LocationSubmitRequest,
  User,
  AgentQueryRequest,
  AgentQueryResponse,
  AgentStatus,
  Geofence,
  GeofenceCreateRequest,
} from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api/v1";

interface ApiClientConfig {
  baseURL: string;
  token?: string;
}

export type DeviceContext =
  Record<string, unknown> & {
    device_name?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    speed?: number;
    device_status?: string;
    device_id?: string;
  };

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(
    config: Partial<ApiClientConfig> = {}
  ) {
    this.baseURL =
      config.baseURL || API_BASE;

    if (typeof window !== "undefined") {
      this.token = getToken();
    }
  }

  // =========================================================
  // Token management
  // =========================================================

  setToken(token: string) {
    this.token = token;
    setAuthToken(token);
  }

  clearToken() {
    this.token = null;
    authLogout();
  }

  /**
   * Always read the latest token from auth.ts.
   *
   * This prevents the API client from using an
   * expired token that was captured when the client
   * was first created.
   */
  private getHeaders(
    includeAuth: boolean = true
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (includeAuth) {
      const currentToken =
        getToken();

      if (currentToken) {
        headers.Authorization =
          `Bearer ${currentToken}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(
    response: Response
  ): Promise<T> {
    if (!response.ok) {
      let errorMessage =
        "API Error";

      try {
        const error =
          await response.json();

        errorMessage =
          error.detail ||
          error.error ||
          error.message ||
          errorMessage;
      } catch {
        // Keep default error message.
      }

      throw new Error(
        errorMessage
      );
    }

    /*
     * DELETE endpoints can return 204.
     * Do not attempt response.json()
     * when there is no response body.
     */
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // =========================================================
  // Authentication
  // =========================================================

  async register(
    data: RegisterRequest
  ): Promise<User> {
    const response =
      await fetch(
        `${this.baseURL}/auth/register`,
        {
          method: "POST",
          headers:
            this.getHeaders(false),
          body: JSON.stringify(data),
        }
      );

    return this.handleResponse<User>(
      response
    );
  }

  async login(
    data: LoginRequest
  ): Promise<AuthTokens> {
    const response =
      await fetch(
        `${this.baseURL}/auth/login`,
        {
          method: "POST",
          headers:
            this.getHeaders(false),
          body: JSON.stringify(data),
        }
      );

    const tokens =
      await this.handleResponse<AuthTokens>(
        response
      );

    this.setToken(
      tokens.access_token
    );

    if (tokens.refresh_token) {
      setAuthRefreshToken(
        tokens.refresh_token
      );
    }

    return tokens;
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(
      `${this.baseURL}/users/me`,
      {
        method: "GET",
        headers: this.getHeaders(true),
      }
    );

    return this.handleResponse<User>(response);
  }

  async updateCurrentUser(
    data: Partial<
      Pick<
        User,
        | "full_name"
        | "phone"
        | "location_history_enabled"
        | "location_retention_days"
      >
    >
  ): Promise<User> {
    const response = await fetch(
      `${this.baseURL}/users/me`,
      {
        method: "PATCH",
        headers: this.getHeaders(true),
        body: JSON.stringify(data),
      }
    );

    return this.handleResponse<User>(response);
  }

  async refreshToken(
    refreshToken: string
  ): Promise<AuthTokens> {
    const response =
      await fetch(
        `${this.baseURL}/auth/refresh`,
        {
          method: "POST",
          headers:
            this.getHeaders(false),
          body: JSON.stringify({
            refresh_token:
              refreshToken,
          }),
        }
      );

    const tokens =
      await this.handleResponse<AuthTokens>(
        response
      );

    this.setToken(
      tokens.access_token
    );

    if (tokens.refresh_token) {
      setAuthRefreshToken(
        tokens.refresh_token
      );
    }

    return tokens;
  }

  // =========================================================
  // Devices
  // =========================================================

  async createDevice(
    data: CreateDeviceRequest
  ): Promise<Device> {
    const response =
      await fetch(
        `${this.baseURL}/devices`,
        {
          method: "POST",
          headers:
            this.getHeaders(true),
          body: JSON.stringify(data),
        }
      );

    return this.handleResponse<Device>(
      response
    );
  }

  async listDevices(): Promise<Device[]> {
    const response =
      await fetch(
        `${this.baseURL}/devices`,
        {
          method: "GET",
          headers:
            this.getHeaders(true),
        }
      );

    return this.handleResponse<Device[]>(
      response
    );
  }

  async getDevice(
    deviceId: string
  ): Promise<Device> {
    const response =
      await fetch(
        `${this.baseURL}/devices/${encodeURIComponent(
          deviceId
        )}`,
        {
          method: "GET",
          headers:
            this.getHeaders(true),
        }
      );

    return this.handleResponse<Device>(
      response
    );
  }

  async updateDevice(
    deviceId: string,
    data: Partial<{
      name: string;
      is_active: boolean;
    }>
  ): Promise<Device> {
    const response =
      await fetch(
        `${this.baseURL}/devices/${encodeURIComponent(
          deviceId
        )}`,
        {
          method: "PATCH",
          headers:
            this.getHeaders(true),
          body: JSON.stringify(data),
        }
      );

    return this.handleResponse<Device>(
      response
    );
  }

  async deleteDevice(
    deviceId: string
  ): Promise<void> {
    const response =
      await fetch(
        `${this.baseURL}/devices/${encodeURIComponent(
          deviceId
        )}`,
        {
          method: "DELETE",
          headers:
            this.getHeaders(true),
        }
      );

    await this.handleResponse<void>(
      response
    );
  }

  // =========================================================
  // Locations
  // =========================================================

  async submitLocation(
    deviceId: string,
    data: LocationSubmitRequest
  ): Promise<LocationPoint> {
    const response =
      await fetch(
        `${this.baseURL}/locations?device_id=${encodeURIComponent(
          deviceId
        )}`,
        {
          method: "POST",
          headers:
            this.getHeaders(true),
          body: JSON.stringify(data),
        }
      );

    return this.handleResponse<LocationPoint>(
      response
    );
  }

  async getCurrentLocation(
    deviceId: string
  ): Promise<LocationPoint> {
    const response =
      await fetch(
        `${this.baseURL}/locations/current/${encodeURIComponent(
          deviceId
        )}`,
        {
          method: "GET",
          headers:
            this.getHeaders(true),
        }
      );

    return this.handleResponse<LocationPoint>(
      response
    );
  }

  async getLocationHistory(
    deviceId: string,
    startDate?: string,
    endDate?: string,
    limit: number = 1000
  ): Promise<LocationHistory> {
    const params =
      new URLSearchParams();

    if (startDate) {
      params.append(
        "start_date",
        startDate
      );
    }

    if (endDate) {
      params.append(
        "end_date",
        endDate
      );
    }

    params.append(
      "limit",
      limit.toString()
    );

    const response =
      await fetch(
        `${this.baseURL}/locations/history/${encodeURIComponent(
          deviceId
        )}?${params.toString()}`,
        {
          method: "GET",
          headers:
            this.getHeaders(true),
        }
      );

    return this.handleResponse<LocationHistory>(
      response
    );
  }

  // =========================================================
  // Selected Device Context
  // =========================================================

  async getSelectedDeviceContext(
    selectedDeviceId?: string
  ): Promise<DeviceContext> {
    const devices =
      await this.listDevices();

    if (
      !devices ||
      devices.length === 0
    ) {
      return {};
    }

    /*
     * Use the explicitly selected device
     * when available.
     *
     * Otherwise use the first available
     * device.
     */
    const device =
      (
        selectedDeviceId
          ? devices.find(
              (item) =>
                String(item.id) ===
                String(selectedDeviceId)
            )
          : undefined
      ) ||
      devices[0];

    const deviceContext:
      DeviceContext = {
        device_id:
          String(device.id),

        device_name:
          device.name,

        device_status:
          device.is_active
            ? "active"
            : "inactive",
      };

    /*
     * Current location is stored separately
     * from the device record.
     */
    try {
      const location =
        await this.getCurrentLocation(
          String(device.id)
        );

      if (location) {
        deviceContext.latitude =
          location.latitude;

        deviceContext.longitude =
          location.longitude;

        if (
          location.accuracy !==
            undefined &&
          location.accuracy !== null
        ) {
          deviceContext.accuracy =
            location.accuracy;
        }

        if (
          location.speed !==
            undefined &&
          location.speed !== null
        ) {
          deviceContext.speed =
            location.speed;
        }
      }
    } catch {
      /*
       * A device can exist without
       * having reported a location yet.
       *
       * Do not fail the AI request
       * because location data is
       * unavailable.
       */
    }

    return deviceContext;
  }

  // =========================================================
  // Permissions
  // =========================================================

  async grantPermission(
    data: GrantPermissionRequest
  ): Promise<LocationPermission> {
    const response =
      await fetch(
        `${this.baseURL}/permissions/location`,
        {
          method: "POST",
          headers:
            this.getHeaders(true),
          body: JSON.stringify(data),
        }
      );

    return this.handleResponse<LocationPermission>(
      response
    );
  }

  async revokePermission(
    permissionId: string
  ): Promise<void> {
    const response =
      await fetch(
        `${this.baseURL}/permissions/location/${encodeURIComponent(
          permissionId
        )}`,
        {
          method: "DELETE",
          headers:
            this.getHeaders(true),
        }
      );

    await this.handleResponse<void>(
      response
    );
  }

  async listPermissions(): Promise<PermissionList> {
    const response =
      await fetch(
        `${this.baseURL}/permissions`,
        {
          method: "GET",
          headers:
            this.getHeaders(true),
        }
      );

    return this.handleResponse<PermissionList>(
      response
    );
  }

  // =========================================================
  // Geofences
  // =========================================================

  async listGeofences(): Promise<Geofence[]> {
    const response = await fetch(
      `${this.baseURL}/geofences`,
      {
        method: "GET",
        headers: this.getHeaders(true),
      }
    );

    return this.handleResponse<Geofence[]>(response);
  }

  async createGeofence(
    data: GeofenceCreateRequest
  ): Promise<Geofence> {
    const response = await fetch(
      `${this.baseURL}/geofences`,
      {
        method: "POST",
        headers: this.getHeaders(true),
        body: JSON.stringify(data),
      }
    );

    return this.handleResponse<Geofence>(response);
  }

  async deleteGeofence(
    geofenceId: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/geofences/${encodeURIComponent(
        geofenceId
      )}`,
      {
        method: "DELETE",
        headers: this.getHeaders(true),
      }
    );

    await this.handleResponse<void>(response);
  }

  // =========================================================
  // AI Agent
  // =========================================================

  async queryAgent(
    query: string,
    context: DeviceContext = {}
  ): Promise<AgentQueryResponse> {
    const request:
      AgentQueryRequest = {
        query,
        context,
      };

    /*
     * Always get the latest token.
     */
    let token =
      getToken();

    const makeRequest =
      async (
        accessToken: string | null
      ): Promise<Response> => {
        const headers:
          Record<string, string> = {
            "Content-Type":
              "application/json",
          };

        if (accessToken) {
          headers.Authorization =
            `Bearer ${accessToken}`;
        }

        return fetch(
          `${this.baseURL}/agent/query`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(
              request
            ),
          }
        );
      };

    /*
     * First request.
     */
    let response =
      await makeRequest(token);

    /*
     * Access token expired.
     *
     * Refresh it once and retry
     * the original request.
     */
    if (
      response.status === 401
    ) {
      try {
        token =
          await refreshAccessToken();

        this.token =
          token;

        response =
          await makeRequest(
            token
          );
      } catch {
        this.clearToken();

        throw new Error(
          "Your session has expired. Please log in again."
        );
      }
    }

    /*
     * If the refreshed token is
     * also rejected, clear the
     * authentication state.
     */
    if (
      response.status === 401
    ) {
      this.clearToken();

      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    return this.handleResponse<AgentQueryResponse>(
      response
    );
  }

  async getAgentStatus(): Promise<AgentStatus> {
    /*
     * Agent status is a public
     * health/status endpoint.
     */
    const response =
      await fetch(
        `${this.baseURL}/agent/status`,
        {
          method: "GET",
          headers:
            this.getHeaders(false),
        }
      );

    return this.handleResponse<AgentStatus>(
      response
    );
  }

  // =========================================================
  // Satellite
  // =========================================================

  async getSatelliteStatus() {
    /*
     * Satellite status is public.
     * No user authentication required.
     */
    const response =
      await fetch(
        `${this.baseURL}/satellite/status`,
        {
          method: "GET",
          headers:
            this.getHeaders(false),
        }
      );

    return this.handleResponse(
      response
    );
  }

  async getSatelliteScenes(
    bbox: string,
    options?: {
      start_date?: string;
      end_date?: string;
      max_cloud_cover?: number;
      limit?: number;
    }
  ) {
    const params =
      new URLSearchParams({
        bbox,
        limit: String(
          options?.limit ?? 10
        ),
      });

    if (
      options?.start_date
    ) {
      params.set(
        "start_date",
        options.start_date
      );
    }

    if (
      options?.end_date
    ) {
      params.set(
        "end_date",
        options.end_date
      );
    }

    if (
      options?.max_cloud_cover !==
      undefined
    ) {
      params.set(
        "max_cloud_cover",
        String(
          options.max_cloud_cover
        )
      );
    }

    /*
     * Satellite scene discovery
     * is public.
     */
    const response =
      await fetch(
        `${this.baseURL}/satellite/scenes?${params.toString()}`,
        {
          method: "GET",
          headers:
            this.getHeaders(false),
        }
      );

    return this.handleResponse(
      response
    );
  }
}

export const apiClient =
  new ApiClient();