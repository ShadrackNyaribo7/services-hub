import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/services/(.*)/book(.*)",
]);

const authorizedParties =
  process.env.NODE_ENV === "production"
    ? ["https://www.patanafuu.pro"]
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  },
  { authorizedParties },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
