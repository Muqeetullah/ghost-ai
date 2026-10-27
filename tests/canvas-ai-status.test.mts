import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { test } from "node:test"
import { createElement, type ComponentType } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { build } from "esbuild"

// Render the real status component against an unavailable feed, without network access.
const result = await build({
  stdin: {
    contents: 'export { CanvasAiStatusFeed } from "./components/editor/canvas-ai-status"; export { setFeedState } from "@liveblocks/react"',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  packages: "external",
  plugins: [{
    name: "unavailable-feed",
    setup(build) {
      build.onResolve({ filter: /^(@liveblocks\/react|@xyflow\/react)/ }, ({ path }) => ({ path, namespace: "test" }))
      build.onLoad({ filter: /.*/, namespace: "test" }, ({ path }) => ({
        contents: path === "@xyflow/react"
          ? 'import { createElement } from "react"; export const Panel = ({ children }) => createElement("div", null, children);'
          : path.endsWith("/suspense")
            ? 'export function useFeedMessages() { throw new Error("Feed messages fetch timeout") }'
            : 'let state = {isLoading: true}; export function setFeedState(next) {state = next}; export function useFeedMessages() {return state}; export function useRoom() {return {id: "test-room"}}',
        loader: "js",
        resolveDir: process.cwd(),
      }))
    },
  }],
})
const compiled = { exports: {} }
new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports)
const { CanvasAiStatusFeed, setFeedState } = compiled.exports as {
  CanvasAiStatusFeed: ComponentType
  setFeedState: (state: { error?: Error; isLoading: boolean }) => void
}

test("a feed timeout leaves the workspace renderable while the HTTP fallback loads", () => {
  setFeedState({ error: new Error("Feed messages fetch timeout"), isLoading: false })
  const html = renderToStaticMarkup(createElement("main", null,
    createElement("div", null, "Editable architecture"), createElement(CanvasAiStatusFeed)))
  assert.match(html, /Editable architecture/)
  assert.doesNotMatch(html, /Canvas connection failed/)
})

test("loading status does not suspend or replace the canvas", () => {
  setFeedState({ isLoading: true })
  assert.equal(renderToStaticMarkup(createElement(CanvasAiStatusFeed)), "")
})
