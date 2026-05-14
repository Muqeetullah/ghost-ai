import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in"
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up"
const signInPath = getPathname(signInUrl)
const signUpPath = getPathname(signUpUrl)

const isPublicRoute = createRouteMatcher([
  `${signInPath}(.*)`,
  `${signUpPath}(.*)`,
])
const hasRouteHandlerAuth = createRouteMatcher(["/api/projects(.*)"])

export const proxy = clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request) && !hasRouteHandlerAuth(request)) {
      await auth.protect()
    }
  },
  {
    signInUrl,
    signUpUrl,
  }
)

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
}

function getPathname(value: string) {
  return new URL(value, "http://localhost").pathname
}
