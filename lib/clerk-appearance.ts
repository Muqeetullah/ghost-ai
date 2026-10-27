import { dark } from "@clerk/ui/themes"

export const clerkSignInUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in"

export const clerkSignUpUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up"

export const clerkAfterSignInUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? "/editor"

export const clerkAfterSignUpUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ?? "/editor"

export const clerkAppearance = {
  theme: dark,
  variables: {
    colorPrimary: "var(--accent-primary)",
    colorPrimaryForeground: "var(--bg-base)",
    colorDanger: "var(--state-error)",
    colorSuccess: "var(--state-success)",
    colorWarning: "var(--state-warning)",
    colorBackground: "var(--bg-surface)",
    colorForeground: "var(--text-primary)",
    colorMuted: "var(--bg-subtle)",
    colorMutedForeground: "var(--text-muted)",
    colorInput: "var(--bg-elevated)",
    colorInputForeground: "var(--text-primary)",
    colorBorder: "var(--border-default)",
    colorModalBackdrop: "var(--overlay-backdrop)",
    colorRing: "var(--accent-primary)",
    colorShadow: "var(--bg-base)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-geist-sans)",
    fontFamilyButtons: "var(--font-geist-sans)",
  },
  elements: {
    rootBox: {
      width: "100%",
    },
    cardBox: {
      width: "100%",
      boxShadow: "none",
    },
    card: {
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      padding: "2rem",
    },
    headerTitle: {
      color: "var(--text-primary)",
      fontSize: "1.25rem",
      fontWeight: "600",
      letterSpacing: "0",
    },
    headerSubtitle: {
      color: "var(--text-muted)",
      lineHeight: "1.5rem",
    },
    main: {
      gap: "1rem",
    },
    footer: {
      backgroundColor: "var(--bg-surface)",
      borderTop: "1px solid var(--border-default)",
    },
    footerActionText: {
      color: "var(--text-muted)",
    },
    footerActionLink: {
      color: "var(--accent-primary)",
    },
    formButtonPrimary: {
      height: "2.75rem",
      boxShadow: "none",
      fontWeight: "600",
    },
    socialButtonsBlockButton: {
      backgroundColor: "var(--bg-elevated)",
      borderColor: "var(--border-default)",
      color: "var(--text-primary)",
      height: "2.75rem",
    },
    formFieldInput: {
      backgroundColor: "var(--bg-elevated)",
      borderColor: "var(--border-subtle)",
      color: "var(--text-primary)",
      height: "2.75rem",
    },
    formFieldLabel: {
      color: "var(--text-secondary)",
      fontWeight: "500",
    },
    dividerText: {
      color: "var(--text-muted)",
    },
    dividerLine: {
      backgroundColor: "var(--border-default)",
    },
    modalBackdrop: {
      backgroundColor: "var(--overlay-backdrop)",
    },
    modalContent: {
      backgroundColor: "var(--bg-surface)",
    },
  },
} as const

export const clerkUserButtonAppearance = {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    rootBox: {
      width: "auto",
    },
    userButtonBox: {
      width: "auto",
    },
    userButtonTrigger: {
      width: "2rem",
      height: "2rem",
    },
  },
} as const

// Auth page refinements stay separate from account menus and profile modals.
export const clerkAuthAppearance = {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    cardBox: {
      width: "100%",
      boxShadow: "none",
      borderRadius: "1rem",
      overflow: "hidden",
      border: "1px solid var(--border-default)",
    },
    card: {
      backgroundColor: "var(--bg-surface)",
      border: "none",
      boxShadow: "none",
      padding: "clamp(1.25rem, 4vw, 2rem)",
      borderRadius: "0",
    },
    headerTitle: {
      ...clerkAppearance.elements.headerTitle,
      fontSize: "1.5rem",
      letterSpacing: "-0.04em",
    },
    formFieldInput: {
      ...clerkAppearance.elements.formFieldInput,
      borderRadius: "0.75rem",
    },
    formButtonPrimary: {
      ...clerkAppearance.elements.formButtonPrimary,
      backgroundColor: "var(--accent-primary)",
      backgroundImage: "none",
      borderRadius: "0.75rem",
    },
    socialButtonsBlockButton: {
      ...clerkAppearance.elements.socialButtonsBlockButton,
      borderRadius: "0.75rem",
    },
  },
} as const
