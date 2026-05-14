import { SignUp } from "@clerk/nextjs"

import { AuthShell } from "@/components/auth/auth-shell"
import {
  clerkAfterSignUpUrl,
  clerkAppearance,
  clerkSignInUrl,
  clerkSignUpUrl,
} from "@/lib/clerk-appearance"

export default function SignUpPage() {
  return (
    <AuthShell mode="sign-up">
      <SignUp
        appearance={clerkAppearance}
        fallbackRedirectUrl={clerkAfterSignUpUrl}
        path={clerkSignUpUrl}
        routing="path"
        signInUrl={clerkSignInUrl}
      />
    </AuthShell>
  )
}
