// Agent identity — persistent anonymous UUID stored in localStorage
// This UUID is hashed server-side (SHA-256) before storage, so the server
// never sees a reversible identifier.

const STORAGE_KEY = 'vl_agent_uuid';

export function getAgentUUID() {
  let uuid = localStorage.getItem(STORAGE_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, uuid);
  }
  return uuid;
}

export function getTenantSlug() {
  return localStorage.getItem('vl_tenant') || null;
}
