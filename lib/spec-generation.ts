import { z } from "zod";

import { NODE_SHAPES } from "@/types/canvas";

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
