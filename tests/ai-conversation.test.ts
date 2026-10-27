import assert from "node:assert/strict"
import { test } from "node:test"
import { getAiChatFeedMessages, mergeAiChatMessages, type AiChatFeedMessage } from "../types/tasks"
import { normalizeSpecChatHistory } from "../lib/spec-generation"

const request: AiChatFeedMessage = {
  id: "user-message", createdAt: 100,
  type: "ai-chat", role: "user", sender: "Designer",
  content: "Include a database replica and a queue.", timestamp: "2026-10-27T09:00:00Z",
}
const reply: AiChatFeedMessage = {
  ...request, id: "agent-message", createdAt: 200,
  role: "assistant", sender: "Ghost AI", content: "Canvas updated: Applied 2 nodes, 1 edge.",
}

test("a pending request stays visible until the feed catches up without duplicates", () => {
  assert.deepEqual(mergeAiChatMessages([], [request]), [request])
  assert.deepEqual(mergeAiChatMessages([reply, request], [request, reply]), [request, reply])
})

test("saved feed messages restore both roles in chronological order", () => {
  const restored = getAiChatFeedMessages([
    { id: reply.id, createdAt: reply.createdAt, data: reply },
    { id: request.id, createdAt: request.createdAt, data: request },
    { id: "invalid", createdAt: 300, data: { content: "untrusted" } },
  ])
  assert.deepEqual(restored.map((message) => message.role), ["user", "assistant"])
  assert.equal(restored[0].content, request.content)
})

test("spec context keeps user requirements while removing routine completion chatter", () => {
  const history = normalizeSpecChatHistory([request, reply])
  assert.equal(history.length, 1)
  assert.equal(history[0].content, request.content)
})
