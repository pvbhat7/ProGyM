// Mobiles that always land on /tab (tablet dashboard) and are exempt from auto-logout.
export const TAB_DASHBOARD_MOBILES = new Set<string>(['9226360506'])

export function isTabDashboardMobile(mobile: string | null | undefined): boolean {
  return !!mobile && TAB_DASHBOARD_MOBILES.has(mobile)
}
