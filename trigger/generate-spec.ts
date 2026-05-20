import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"
import { logger, metadata, task } from "@trigger.dev/sdk"

import { prisma } from "@/lib/prisma"
import {
  specGenerationTaskPayloadSchema,
  type SpecCanvasEdgeInput,
  type SpecCanvasNodeInput,
  type SpecChatMessage,
  type SpecGenerationTaskPayload,
} from "@/lib/spec-generation"

interface SpecProjectContext {
  description: string | null
  id: string
  name: string
}

export const generateSpec = task({
  id: "generate-spec",
  run: async (payload: SpecGenerationTaskPayload) => {
    metadata.set("status", "starting")

    try {
      const input = specGenerationTaskPayloadSchema.parse(payload)

      metadata
        .set("projectId", input.projectId)
        .set("roomId", input.roomId)
        .set("status", "loading_context")
        .set("chatMessages", input.chatHistory.length)
        .set("edgeCount", input.edges.length)
        .set("nodeCount", input.nodes.length)

      logger.info("Spec generation task started", {
        chatMessages: input.chatHistory.length,
        edgeCount: input.edges.length,
        nodeCount: input.nodes.length,
        projectId: input.projectId,
        roomId: input.roomId,
      })

      const project = await readSpecProjectContext(input.projectId)
      assertSpecRoomMatchesProject(input.roomId, project.id)

      metadata.set("status", "generating")

      const markdown = await generateMarkdownSpec(input, project)
      const heading = readFirstMarkdownHeading(markdown)

      metadata
        .set("status", "completed")
        .set("markdownLength", markdown.length)
        .set("title", heading ?? `${project.name} Technical Specification`)

      logger.info("Spec generation task completed", {
        markdownLength: markdown.length,
        projectId: input.projectId,
        roomId: input.roomId,
        title: heading,
      })

      return markdown
    } catch (error) {
      const errorMessage = getErrorMessage(error)

      metadata.set("status", "error").set("error", errorMessage)
      logger.error("Spec generation task failed", {
        error: errorMessage,
      })

      throw error
    }
  },
})

async function readSpecProjectContext(
  projectId: string
): Promise<SpecProjectContext> {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      description: true,
      id: true,
      name: true,
    },
  })

  if (!project) {
    throw new Error("Project not found for spec generation")
  }

  return project
}

function assertSpecRoomMatchesProject(roomId: string, projectId: string) {
  if (roomId !== projectId) {
    throw new Error("Spec generation room does not match project")
  }
}

async function generateMarkdownSpec(
  payload: SpecGenerationTaskPayload,
  project: SpecProjectContext
) {
  const google = getGoogleProvider()
  const result = await generateText({
    model: google("gemini-2.5-flash"),
    temperature: 0.2,
    system: buildSpecSystemPrompt(),
    prompt: buildSpecUserPrompt(payload, project),
  })
  const markdown = result.text.trim()

  if (!markdown) {
    throw new Error("Spec generation returned empty Markdown")
  }

  return markdown
}

function buildSpecSystemPrompt() {
  return [
    "You are Ghost AI, a senior systems architect producing a polished engineering specification from a collaborative architecture canvas.",
    "Return Markdown only. Do not include preambles, commentary about the task, JSON, code fences, or references to these instructions.",
    "Write for an engineering team that will use this document for implementation planning, review, and handoff.",
    "Treat the canvas graph as the source of truth: nodes are system components, edges are relationships or flows, labels are domain-specific clues, and layout may imply grouping or boundaries.",
    "Use chat history only to clarify intent, constraints, business goals, terminology, or unresolved decisions. Do not let chat history override explicit canvas structure.",
    "Do not invent components, integrations, storage systems, protocols, scale requirements, or security controls unless they are clearly implied by the canvas or chat context.",
    "When a detail is not present, use disciplined language such as 'Assumption', 'Open question', or 'Not specified' instead of filling gaps silently.",
    "Produce a professional technical spec with these sections: Title, Executive Summary, System Context, Architecture Overview, Component Responsibilities, Data and Control Flows, Interfaces and Integration Points, Data Storage and State, Reliability and Operational Considerations, Security and Access Considerations, Implementation Notes, Assumptions, Open Questions.",
    "In Component Responsibilities, cover every meaningful canvas node. For each component, explain its role, key inputs, key outputs, dependencies, and operational concerns when supported by the graph.",
    "In Data and Control Flows, describe the important edge paths end to end. Preserve directionality and explain what crosses each boundary or dependency.",
    "Prefer concrete nouns and implementation-ready language over generic filler. Avoid marketing tone, vague claims, and repeated boilerplate.",
    "Use tables where they improve scanability, especially for component inventories, interfaces, assumptions, and open questions.",
    "Keep the document concise but substantial: enough depth for engineers to act, without padding or unsupported speculation.",
  ].join("\n")
}

function buildSpecUserPrompt(
  payload: SpecGenerationTaskPayload,
  project: SpecProjectContext
) {
  return JSON.stringify(
    {
      chatHistory: payload.chatHistory.map(serializeChatMessage),
      graph: {
        edges: payload.edges.map(serializeEdge),
        nodes: payload.nodes.map(serializeNode),
      },
      project,
      roomId: payload.roomId,
    },
    null,
    2
  )
}

function serializeChatMessage(message: SpecChatMessage) {
  return {
    content: message.content,
    role: message.role,
    sender: message.sender ?? null,
    timestamp: message.timestamp ?? null,
  }
}

function serializeNode(node: SpecCanvasNodeInput) {
  return {
    color: node.data.color,
    height: node.height ?? node.initialHeight ?? null,
    id: node.id,
    label: node.data.label,
    position: node.position,
    shape: node.data.shape,
    width: node.width ?? node.initialWidth ?? null,
  }
}

function serializeEdge(edge: SpecCanvasEdgeInput) {
  return {
    id: edge.id,
    label:
      typeof edge.label === "number" ? String(edge.label) : edge.label ?? null,
    source: edge.source,
    target: edge.target,
  }
}

function getGoogleProvider() {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is required")
  }

  return createGoogleGenerativeAI({ apiKey })
}

function readFirstMarkdownHeading(markdown: string) {
  const headingLine = markdown
    .split("\n")
    .find((line) => line.trim().startsWith("# "))

  return headingLine ? headingLine.replace(/^#\s+/, "").trim() : null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown spec generation error"
}
