import { SignIn } from "@clerk/nextjs"

import { AuthShell } from "@/components/auth/auth-shell"
import {
  clerkAfterSignInUrl,
  clerkAppearance,
  clerkSignInUrl,
  clerkSignUpUrl,
} from "@/lib/clerk-appearance"

export default function SignInPage() {
  return (
    <AuthShell mode="sign-in">
      <SignIn
        appearance={clerkAppearance}
        fallbackRedirectUrl={clerkAfterSignInUrl}
        path={clerkSignInUrl}
        routing="path"
        signUpUrl={clerkSignUpUrl}
      />
    </AuthShell>
  )
}
