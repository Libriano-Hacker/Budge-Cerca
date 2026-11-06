import type { AppData, Business } from "./domain";
export type Access = { role: "owner" | "admin"; neighborhoods: string[] };
export type CatalogRecord = {
  id: string;
  neighborhood: string;
  published: Business | null;
  draft: Business | null;
  revision: number;
  archived: boolean;
  updated_at: string;
};
export type RequestPayload = {
  kind: "new" | "correction";
  businessId?: string;
  neighborhood: string;
  name?: string;
  category?: string;
  address?: string;
  description?: string;
  whatsapp?: string;
  field?: string;
  note: string;
  contactName?: string;
  contact?: string;
};
export type CatalogRequest = {
  id: string;
  kind: RequestPayload["kind"];
  business_id: string | null;
  neighborhood: string;
  payload: RequestPayload;
  status: "pending" | "needs_changes" | "approved" | "rejected";
  revision: number;
  review_note: string;
  created_at: string;
  reviewed_at: string | null;
};
export type CatalogHistory = {
  id: string;
  business_id: string;
  revision: number;
  action: "draft" | "publish" | "restore" | "archive";
  payload: Business;
  actor: string;
  created_at: string;
};
export type AdminCatalog = {
  revision: number;
  data: AppData;
  records: CatalogRecord[];
  requests: CatalogRequest[];
};
export type ApiConfig = {
  configured: boolean;
  mode: "live" | "test" | "unconfigured";
  photosEnabled: boolean;
};
export type AdminSession = {
  user: { id: string; email: string };
  access: Access;
  csrf: string;
};
