import { z } from "zod";

import { NODE_SHAPES } from "@/types/canvas";

export const MAX_SPEC_CHAT_HISTORY_MESSAGES = 12;
export const MAX_SPEC_CHAT_MESSAGE_CHARS = 600;

const SPEC_CHAT_MESSAGES_TO_IGNORE = [
  /^generating a technical spec from the current canvas and room context\.?$/i,
  /^technical spec generated and saved\./i,
  /^ghost ai could not generate the spec:/i,
  /^canvas updated:/i,
];

export const specChatMessageSchema = z
  .object({
    content: z.string().trim().min(1),
    role: z.string().trim().min(1),
    sender: z.string().trim().min(1).optional(),
    timestamp: z.string().trim().min(1).optional(),
  })
  .passthrough();

export const specCanvasNodeSchema = z
  .object({
    id: z.string().trim().min(1),
    position: z.object({
      x: z.number().finite(),
      y: z.number().finite(),
    }),
    data: z
      .object({
        color: z.object({
          fill: z.string().trim().min(1),
          text: z.string().trim().min(1),
        }),
        label: z.string(),
        shape: z.enum(NODE_SHAPES),
      })
      .passthrough(),
    height: z.number().finite().optional(),
    initialHeight: z.number().finite().optional(),
    initialWidth: z.number().finite().optional(),
    width: z.number().finite().optional(),
  })
  .passthrough();

export const specCanvasEdgeSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.union([z.string(), z.number()]).optional(),
    source: z.string().trim().min(1),
    target: z.string().trim().min(1),
  })
  .passthrough();

export const specGenerationRequestSchema = z.object({
  chatHistory: z.array(specChatMessageSchema),
  edges: z.array(specCanvasEdgeSchema),
  nodes: z.array(specCanvasNodeSchema),
  roomId: z.string().trim().min(1),
});

export const specGenerationTaskPayloadSchema =
  specGenerationRequestSchema.extend({
    projectId: z.string().trim().min(1),
  });

export type SpecChatMessage = z.infer<typeof specChatMessageSchema>;
export type SpecCanvasEdgeInput = z.infer<typeof specCanvasEdgeSchema>;
export type SpecCanvasNodeInput = z.infer<typeof specCanvasNodeSchema>;
export type SpecGenerationRequest = z.infer<typeof specGenerationRequestSchema>;
export type SpecGenerationTaskPayload = z.infer<
  typeof specGenerationTaskPayloadSchema
>;

export function normalizeSpecChatHistory(
  chatHistory: SpecChatMessage[]
): SpecChatMessage[] {
  return chatHistory
    .map((message) => {
      const content = clampSpecChatMessageContent(message.content);

      return {
        ...message,
        content,
      };
    })
    .filter((message) => isRelevantSpecChatMessage(message))
    .slice(-MAX_SPEC_CHAT_HISTORY_MESSAGES)
    .filter((message) => message.content.length > 0);
}

function clampSpecChatMessageContent(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= MAX_SPEC_CHAT_MESSAGE_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_SPEC_CHAT_MESSAGE_CHARS - 3).trimEnd()}...`;
}

function isRelevantSpecChatMessage(message: SpecChatMessage) {
  if (message.role === "user") {
    return true;
  }

  return !SPEC_CHAT_MESSAGES_TO_IGNORE.some((pattern) =>
    pattern.test(message.content)
  );
}
