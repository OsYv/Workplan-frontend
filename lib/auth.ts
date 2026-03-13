export const ADMIN_ONLY_PATHS = ["/dienstplan", "/benutzer", "/schichtvorlagen"];

export function isAdmin(role?: string | null) {
  return role === "admin";
}

export function canAccessPath(pathname: string, role?: string | null) {
  if (ADMIN_ONLY_PATHS.includes(pathname)) {
    return isAdmin(role);
  }

  return true;
}

export function getHomeRouteForRole(role?: string | null) {
  if (role === "admin") return "/dashboard";
  return "/dashboard";
}