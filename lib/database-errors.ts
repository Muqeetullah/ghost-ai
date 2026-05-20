export function isDatabaseUnavailableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message.includes("Can't reach database server") ||
    error.message.includes("P1001")
  )
}
