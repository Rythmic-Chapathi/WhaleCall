import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// SOS and the landing page are deliberately public -- no login required to
// reach emergency dispatch. Everything else in the rideshare flow needs a
// signed-in user.
const isProtectedRoute = createRouteMatcher(["/home(.*)", "/rides(.*)", "/dispatcher(.*)", "/fleet(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Clerk's own frontend API proxy path -- required immediately after the
    // API matcher above per Clerk's Next.js integration guidance.
    "/__clerk/:path*",
  ],
};
