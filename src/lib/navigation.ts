export const MOBILE_NAV_ITEMS = [
  { href: "/services", label: "Find Services" },
  { href: "/providers/apply", label: "Become a Provider" },
  { href: "/providers/profile", label: "Provider Profile" },
  { href: "/providers/operations", label: "Provider Operations" },
  { href: "/signin", label: "Sign In" },
] as const;

export const FOOTER_NAV_ITEMS = [
  ...MOBILE_NAV_ITEMS.slice(0, 4),
  { href: "/admin/bookings", label: "Admin Dashboard" },
] as const;

export const LEGAL_NAV_ITEMS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Refund Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;
