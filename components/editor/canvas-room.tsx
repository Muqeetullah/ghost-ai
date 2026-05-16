"use client"

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type ErrorInfo,
  type ReactNode,
} from "react"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense"
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  MarkerType,
  MiniMap,
  ReactFlow,
  type DefaultEdgeOptions,
  type ReactFlowInstance,
} from "@xyflow/react"

import {
  CanvasNodeRenderer,
  NodeShapeSurface,
} from "@/components/editor/canvas-node"
import {
  CanvasShapePanel,
  hasShapeDragPayload,
  readShapeDragPayload,
  type ShapeDragPayload,
} from "@/components/editor/shape-panel"
import {
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas"

const initialNodes: CanvasNode[] = []
const initialEdges: CanvasEdge[] = []

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "var(--text-primary)",
  },
  style: {
    stroke: "var(--text-primary)",
    strokeWidth: 1.25,
  },
}

const nodeTypes = {
  [CANVAS_NODE_TYPE]: CanvasNodeRenderer,
}

interface CanvasRoomProps {
  roomId: string
}

interface ShapeDragPreview {
  payload: ShapeDragPayload
  position: {
    x: number
    y: number
  }
}

export function CanvasRoom({ roomId }: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
        <CanvasErrorBoundary key={roomId} fallback={<CanvasErrorState />}>
          <ClientSideSuspense fallback={<CanvasLoadingState />}>
            {() => <CanvasFlow />}
          </ClientSideSuspense>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function CanvasFlow() {
  const flowInstanceRef =
    useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null)
  const nodeCounterRef = useRef(0)
  const [shapeDragPreview, setShapeDragPreview] =
    useState<ShapeDragPreview | null>(null)
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: {
        initial: initialNodes,
      },
      edges: {
        initial: initialEdges,
      },
    })

  const handleInit = useCallback(
    (flowInstance: ReactFlowInstance<CanvasNode, CanvasEdge>) => {
      flowInstanceRef.current = flowInstance
    },
    []
  )

  const clearShapeDragPreview = useCallback(() => {
    setShapeDragPreview(null)
  }, [])

  const updateShapeDragPreviewPosition = useCallback(
    (position: ShapeDragPreview["position"]) => {
      setShapeDragPreview((currentPreview) => {
        if (!currentPreview) {
          return currentPreview
        }

        return {
          ...currentPreview,
          position,
        }
      })
    },
    []
  )

  const handleShapeDragStart = useCallback(
    (
      payload: ShapeDragPayload,
      position: ShapeDragPreview["position"]
    ) => {
      setShapeDragPreview({ payload, position })
    },
    []
  )

  const addShapeNode = useCallback(
    (payload: ShapeDragPayload, position: CanvasNode["position"]) => {
      const flowInstance = flowInstanceRef.current

      if (!flowInstance) {
        return
      }

      nodeCounterRef.current += 1

      const node: CanvasNode = {
        id: `${payload.shape}-${Date.now()}-${nodeCounterRef.current}`,
        type: CANVAS_NODE_TYPE,
        position,
        width: payload.size.width,
        height: payload.size.height,
        initialWidth: payload.size.width,
        initialHeight: payload.size.height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR,
          shape: payload.shape,
        },
      }

      flowInstance.addNodes(node)
    },
    []
  )

  const handleShapeInsert = useCallback(
    (payload: ShapeDragPayload) => {
      const flowInstance = flowInstanceRef.current

      if (!flowInstance) {
        return
      }

      const centerPosition = flowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })

      addShapeNode(payload, {
        x: centerPosition.x - payload.size.width / 2,
        y: centerPosition.y - payload.size.height / 2,
      })
    },
    [addShapeNode]
  )

  const isShapeDragPreviewVisible = shapeDragPreview !== null

  useEffect(() => {
    if (!isShapeDragPreviewVisible) {
      return
    }

    function handleWindowDragOver(event: globalThis.DragEvent) {
      updateShapeDragPreviewPosition({
        x: event.clientX,
        y: event.clientY,
      })
    }

    window.addEventListener("dragover", handleWindowDragOver)
    window.addEventListener("drop", clearShapeDragPreview)
    window.addEventListener("blur", clearShapeDragPreview)

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver)
      window.removeEventListener("drop", clearShapeDragPreview)
      window.removeEventListener("blur", clearShapeDragPreview)
    }
  }, [
    clearShapeDragPreview,
    isShapeDragPreviewVisible,
    updateShapeDragPreviewPosition,
  ])

  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (!hasShapeDragPayload(event.dataTransfer)) {
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
      updateShapeDragPreviewPosition({
        x: event.clientX,
        y: event.clientY,
      })
    },
    [updateShapeDragPreviewPosition]
  )

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      const payload = readShapeDragPayload(event.dataTransfer)
      const flowInstance = flowInstanceRef.current

      clearShapeDragPreview()

      if (!payload || !flowInstance) {
        return
      }

      event.preventDefault()

      const position = flowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addShapeNode(payload, position)
    },
    [addShapeNode, clearShapeDragPreview]
  )

  return (
    <ReactFlow<CanvasNode, CanvasEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onInit={handleInit}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      connectionLineType={ConnectionLineType.SmoothStep}
      connectionMode={ConnectionMode.Loose}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      className="bg-base text-copy-primary"
    >
      <Background
        color="var(--border-default)"
        gap={24}
        size={1}
        variant={BackgroundVariant.Dots}
      />
      <MiniMap<CanvasNode>
        pannable
        zoomable
        nodeColor={(node) => node.data.color.fill}
        nodeStrokeColor={(node) => node.data.color.text}
        bgColor="var(--bg-surface)"
        maskColor="var(--overlay-backdrop)"
        className="rounded-xl border border-surface-border bg-bg-surface shadow-2xl"
      />
      <Cursors />
      <CanvasShapeDragPreview preview={shapeDragPreview} />
      <CanvasShapePanel
        onShapeDragStart={handleShapeDragStart}
        onShapeDragEnd={clearShapeDragPreview}
        onShapeInsert={handleShapeInsert}
      />
    </ReactFlow>
  )
}

interface CanvasShapeDragPreviewProps {
  preview: ShapeDragPreview | null
}

function CanvasShapeDragPreview({ preview }: CanvasShapeDragPreviewProps) {
  if (!preview) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-80"
      style={{
        left: preview.position.x,
        top: preview.position.y,
        width: preview.payload.size.width,
        height: preview.payload.size.height,
      }}
    >
      <NodeShapeSurface
        shape={preview.payload.shape}
        fill={DEFAULT_NODE_COLOR.fill}
        stroke="var(--accent-primary)"
        text={DEFAULT_NODE_COLOR.text}
        selected
      />
    </div>
  )
}

interface CanvasErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface CanvasErrorBoundaryState {
  hasError: boolean
}

class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Liveblocks canvas connection failed", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

function CanvasLoadingState() {
  return (
    <div className="flex h-full items-center justify-center bg-base px-6 text-center">
      <p className="text-sm text-copy-muted">Loading canvas...</p>
    </div>
  )
}

function CanvasErrorState() {
  return (
    <div className="flex h-full items-center justify-center bg-base px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-base font-semibold tracking-normal text-copy-primary">
          Canvas connection failed
        </h1>
        <p className="mt-2 text-sm leading-6 text-copy-muted">
          Refresh the workspace to reconnect to the shared room.
        </p>
      </div>
    </div>
  )
}
