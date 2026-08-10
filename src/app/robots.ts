import type { MetadataRoute } from "next";

const SITE_URL = "https://www.patanafuu.pro";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/providers/apply",
        "/providers/operations",
        "/services/book",
        "/signin",
        "/signup",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
