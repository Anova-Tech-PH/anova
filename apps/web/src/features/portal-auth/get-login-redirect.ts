export function getPortalLoginUrl(currentPath: string): string {
  return `/login?redirect=${encodeURIComponent(currentPath)}`;
}
