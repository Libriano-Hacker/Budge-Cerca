import type { Access } from "../src/catalogApiTypes";
export type ProviderTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};
export type ProviderUser = {
  id: string;
  email: string;
  factors?: { id: string; factor_type: string; status: string }[];
};
export interface CatalogRepository {
  rpc<T>(
    name: string,
    params: Record<string, unknown>,
    credential?: string | "service",
  ): Promise<T>;
  upload(path: string, bytes: Uint8Array): Promise<void>;
  download(path: string): Promise<Uint8Array>;
}
export interface IdentityProvider {
  login(email: string, password: string): Promise<ProviderTokens>;
  user(token: string): Promise<ProviderUser>;
  refresh(token: string): Promise<ProviderTokens>;
  logout(token: string): Promise<void>;
  mfa(token: string, factorId: string, code: string): Promise<ProviderTokens>;
}
export type ApiDependencies = {
  repo: CatalogRepository;
  auth: IdentityProvider;
  origin: string;
  sessionKey: Uint8Array;
  mode: "live" | "test";
  production: boolean;
  now?: () => number;
};
export type Authenticated = {
  user: ProviderUser;
  access: Access;
  token: string;
  csrf: string;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
