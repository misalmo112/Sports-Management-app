import { APIRequestContext, request } from '@playwright/test';
import { TEST_CONFIG } from '../playwright.config';

/**
 * Authentication response from the backend
 */
export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    role: string;
    academy_id: string | null;
  };
}

/**
 * Token storage for test sessions
 */
export interface TokenStorage {
  accessToken: string;
  refreshToken: string;
  user: AuthResponse['user'];
}

/**
 * Auth helper class for managing authentication in tests
 */
export class AuthHelper {
  private apiContext: APIRequestContext | null = null;
  private baseUrl: string;
  private apiPrefix: string;

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
        'Content-Type': 'application/json',
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
   * Login with email and password
   */
  async login(email: string, password: string): Promise<TokenStorage> {
    if (!this.apiContext) {
      await this.init();
    }

    const response = await this.apiContext!.post(`${this.apiPrefix}/auth/token/`, {
      data: { email, password },
    });

    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(`Login failed for ${email}: ${response.status()} - ${errorBody}`);
    }

    const data: AuthResponse = await response.json();
    
    return {
      accessToken: data.access,
      refreshToken: data.refresh,
      user: data.user,
    };
  }

  /**
   * Login as superadmin
   */
  async loginAsSuperadmin(): Promise<TokenStorage> {
    return this.login(
      TEST_CONFIG.SUPERADMIN.email,
      TEST_CONFIG.SUPERADMIN.password
    );
  }

  /**
   * Login as admin
   */
  async loginAsAdmin(email?: string, password?: string): Promise<TokenStorage> {
    return this.login(
      email || TEST_CONFIG.ADMIN.email,
      password || TEST_CONFIG.ADMIN.password
    );
  }

  /**
   * Login as coach
   */
  async loginAsCoach(email?: string, password?: string): Promise<TokenStorage> {
    return this.login(
      email || TEST_CONFIG.COACH.email,
      password || TEST_CONFIG.COACH.password
    );
  }

  /**
   * Login as parent
   */
  async loginAsParent(email?: string, password?: string): Promise<TokenStorage> {
    return this.login(
      email || TEST_CONFIG.PARENT.email,
      password || TEST_CONFIG.PARENT.password
    );
  }

  /**
   * Accept an invite and set password
   */
  async acceptInvite(token: string, password: string): Promise<TokenStorage> {
    if (!this.apiContext) {
      await this.init();
    }

    const response = await this.apiContext!.post(`${this.apiPrefix}/auth/invite/accept/`, {
      data: { token, password, password_confirm: password },
    });

    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(`Accept invite failed: ${response.status()} - ${errorBody}`);
    }

    const data: AuthResponse = await response.json();
    
    return {
      accessToken: data.access,
      refreshToken: data.refresh,
      user: data.user,
    };
  }

  /**
   * Create authorization header value
   */
  static getAuthHeader(token: string): string {
    return `Bearer ${token}`;
  }

  /**
   * Get headers with authentication
   */
  static getAuthHeaders(token: string, academyId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': AuthHelper.getAuthHeader(token),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (academyId) {
      headers['X-Academy-ID'] = academyId;
    }

    return headers;
  }
}

/**
 * Create a new auth helper instance
 */
export function createAuthHelper(baseUrl?: string): AuthHelper {
  return new AuthHelper(baseUrl);
}

/**
 * Convenience functions for quick authentication
 */
export async function loginAsSuperadmin(): Promise<TokenStorage> {
  const helper = createAuthHelper();
  await helper.init();
  try {
    return await helper.loginAsSuperadmin();
  } finally {
    await helper.dispose();
  }
}

export async function loginAsAdmin(email?: string, password?: string): Promise<TokenStorage> {
  const helper = createAuthHelper();
  await helper.init();
  try {
    return await helper.loginAsAdmin(email, password);
  } finally {
    await helper.dispose();
  }
}

export async function loginAsCoach(email?: string, password?: string): Promise<TokenStorage> {
  const helper = createAuthHelper();
  await helper.init();
  try {
    return await helper.loginAsCoach(email, password);
  } finally {
    await helper.dispose();
  }
}

export async function loginAsParent(email?: string, password?: string): Promise<TokenStorage> {
  const helper = createAuthHelper();
  await helper.init();
  try {
    return await helper.loginAsParent(email, password);
  } finally {
    await helper.dispose();
  }
}

export async function acceptInvite(token: string, password: string): Promise<TokenStorage> {
  const helper = createAuthHelper();
  await helper.init();
  try {
    return await helper.acceptInvite(token, password);
  } finally {
    await helper.dispose();
  }
}

/**
 * Get invite token for a user by email (for test setup only)
 * Uses docker-compose exec to regenerate and return the invite token
 */
export async function getInviteTokenForUser(email: string): Promise<string | null> {
  const { execSync } = require('child_process');
  const path = require('path');
  const fs = require('fs');
  const os = require('os');
  
  // Create Python script content
  const scriptLines = [
    "import os, sys, django",
    "os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')",
    "django.setup()",
    "from tenant.users.models import User",
    "from tenant.users.services import UserService",
    "try:",
    `    user = User.objects.get(email='${email.replace(/'/g, "\\'")}')`,
    "    token = UserService.generate_invite_token(user, created_by=None)",
    "    if token:",
    "        print(token, end='', flush=True)",
    "    else:",
    "        sys.exit(1)",
    "except User.DoesNotExist:",
    "    sys.exit(1)",
    "except Exception as e:",
    "    sys.exit(1)"
  ];
  
  const scriptContent = scriptLines.join('\n');
  
  // Write to temp file and execute via docker-compose
  const tempFile = path.join(os.tmpdir(), `get_token_${Date.now()}.py`);
  
  try {
    fs.writeFileSync(tempFile, scriptContent, 'utf-8');
    
    const projectRoot = path.resolve(__dirname, '../../..');
    
    // Copy to container
    try {
      execSync(`docker-compose cp "${tempFile}" backend:/tmp/get_token.py`, {
        cwd: projectRoot,
        stdio: 'ignore',
        shell: true,
        timeout: 5000
      });
    } catch (copyError) {
      // Copy failed, try direct execution with stdin
      const result = execSync(`docker-compose exec -T backend python -`, {
        input: scriptContent,
        encoding: 'utf-8',
        timeout: 15000,
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      if (result && result.length > 10) {
        return result;
      }
      return null;
    }
    
    // Execute in container
    try {
      const result = execSync(`docker-compose exec -T backend python /tmp/get_token.py`, {
        encoding: 'utf-8',
        timeout: 15000,
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe']
      }).trim();
      
      // Cleanup
      try {
        execSync(`docker-compose exec -T backend rm /tmp/get_token.py`, {
          cwd: projectRoot,
          stdio: 'ignore',
          shell: true
        });
      } catch {}
      
      if (result && result.length > 10) {
        return result;
      }
    } catch (execError: any) {
      // Execution failed
      if (execError.stdout) {
        const output = execError.stdout.toString().trim();
        if (output && output.length > 10) {
          return output;
        }
      }
    }
  } catch (error: any) {
    // All approaches failed
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {}
  }
  
  return null;
}

/**
 * Ensure user exists and is authenticated
 * Creates user via invite if needed and accepts invite automatically
 */
export async function ensureUserAuthenticated(
  email: string,
  password: string,
  role: 'ADMIN' | 'COACH' | 'PARENT',
  academyId: string,
  adminToken: string
): Promise<TokenStorage | null> {
  const authHelper = createAuthHelper();
  await authHelper.init();
  
  try {
    // Try to login first
    try {
      const token = await authHelper.login(email, password);
      console.log(`✓ User ${email} already authenticated`);
      return token;
    } catch (loginError) {
      // Login failed - user might not exist or invite not accepted
      console.log(`  Login failed for ${email}, attempting to create/accept invite...`);
    }
    
    // Check if user exists by listing users
    const { createDataFactory } = require('./data.factory');
    const dataFactory = createDataFactory();
    await dataFactory.init();
    dataFactory.setToken(adminToken);
    dataFactory.setAcademyId(academyId);
    
    try {
      const usersResponse = await dataFactory.listUsers();
      const existingUser = usersResponse.ok 
        ? usersResponse.data.results.find((u: any) => u.email === email)
        : null;
      
      let inviteToken: string | null = null;
      
      if (existingUser && !existingUser.is_verified) {
        // User exists but not verified - resend invite to get new token
        console.log(`  Resending invite for ${email}...`);
        const resendResponse = await dataFactory.resendInvite(existingUser.id);
        if (resendResponse.ok) {
          // Wait a bit for token to be generated, then get it
          await new Promise(resolve => setTimeout(resolve, 500));
          inviteToken = await getInviteTokenForUser(email);
        }
      } else if (!existingUser) {
        // User doesn't exist - create invite
        console.log(`  Creating invite for ${email}...`);
        let inviteResponse;
        if (role === 'COACH') {
          inviteResponse = await dataFactory.inviteCoach({ email });
        } else if (role === 'PARENT') {
          inviteResponse = await dataFactory.inviteParent({ email });
        } else {
          inviteResponse = await dataFactory.inviteAdmin({ email });
        }
        
        if (inviteResponse.ok) {
          // Wait a bit for token to be generated, then get it
          await new Promise(resolve => setTimeout(resolve, 500));
          inviteToken = await getInviteTokenForUser(email);
        }
      } else {
        // User exists and is verified - might just need password reset, but try to get token
        inviteToken = await getInviteTokenForUser(email);
      }
      
      // Accept invite if we have a token
      if (inviteToken) {
        console.log(`  Accepting invite for ${email}...`);
        try {
          const token = await authHelper.acceptInvite(inviteToken, password);
          console.log(`✓ Successfully authenticated ${email}`);
          return token;
        } catch (acceptError: any) {
          // If invite acceptance fails, user might already be verified - try login
          console.log(`  ⚠ Failed to accept invite for ${email}, trying login...`);
          try {
            const token = await authHelper.login(email, password);
            console.log(`✓ User ${email} already verified, logged in successfully`);
            return token;
          } catch (loginError) {
            console.log(`  ⚠ Login also failed: ${loginError}`);
            return null;
          }
        }
      } else {
        console.log(`  ⚠ Could not get invite token for ${email} - user may already be verified`);
        // Try login one more time in case user was created/verified by another process
        try {
          const token = await authHelper.login(email, password);
          console.log(`✓ User ${email} already verified, logged in successfully`);
          return token;
        } catch (loginError) {
          console.log(`  ⚠ Login failed: ${loginError}`);
          return null;
        }
      }
    } finally {
      await dataFactory.dispose();
    }
  } finally {
    await authHelper.dispose();
  }
}
