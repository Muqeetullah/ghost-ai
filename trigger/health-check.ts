import { logger, task } from "@trigger.dev/sdk/v3";

interface TriggerHealthCheckPayload {
  source?: string;
}

export const triggerHealthCheck = task({
  id: "trigger-health-check",
  run: async (payload: TriggerHealthCheckPayload) => {
    const checkedAt = new Date().toISOString();
    const source = payload.source ?? "manual";

    logger.info("Trigger.dev health check completed", {
      checkedAt,
      source,
    });

    return {
      ok: true,
      checkedAt,
      source,
    };
  },
});
