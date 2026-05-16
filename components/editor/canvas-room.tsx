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
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react/suspense"
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  type DefaultEdgeOptions,
  type ReactFlowInstance,
} from "@xyflow/react"
import { Maximize2, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react"

import { CanvasEdgeRenderer } from "@/components/editor/canvas-edge"
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
import { Button } from "@/components/ui/button"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas"
import {
  cloneTemplateEdges,
  cloneTemplateNodes,
  type CanvasTemplateImport,
} from "@/components/editor/starter-templates"

const initialNodes: CanvasNode[] = []
const initialEdges: CanvasEdge[] = []

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: CANVAS_EDGE_TYPE,
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

const edgeTypes = {
  [CANVAS_EDGE_TYPE]: CanvasEdgeRenderer,
}

const VIEWPORT_ANIMATION_DURATION = 160

interface CanvasRoomProps {
  roomId: string
  templateImport: CanvasTemplateImport | null
}

interface ShapeDragPreview {
  payload: ShapeDragPayload
  position: {
    x: number
    y: number
  }
}

export function CanvasRoom({ roomId, templateImport }: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
        <CanvasErrorBoundary key={roomId} fallback={<CanvasErrorState />}>
          <ClientSideSuspense fallback={<CanvasLoadingState />}>
            {() => <CanvasFlow templateImport={templateImport} />}
          </ClientSideSuspense>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

interface CanvasFlowProps {
  templateImport: CanvasTemplateImport | null
}

function CanvasFlow({ templateImport }: CanvasFlowProps) {
  const flowInstanceRef =
    useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null)
  const nodeCounterRef = useRef(0)
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null)
  const [shapeDragPreview, setShapeDragPreview] =
    useState<ShapeDragPreview | null>(null)
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
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
      setFlowInstance(flowInstance)
    },
    []
  )

  const handleZoomIn = useCallback(() => {
    void flowInstance?.zoomIn({ duration: VIEWPORT_ANIMATION_DURATION })
  }, [flowInstance])

  const handleZoomOut = useCallback(() => {
    void flowInstance?.zoomOut({ duration: VIEWPORT_ANIMATION_DURATION })
  }, [flowInstance])

  const handleFitView = useCallback(() => {
    void flowInstance?.fitView({
      duration: VIEWPORT_ANIMATION_DURATION,
      padding: 0.16,
    })
  }, [flowInstance])

  const handleConnect = useCallback(
    (connection: Parameters<typeof onConnect>[0]) => {
      const canvasEdgeConnection = {
        ...connection,
        type: CANVAS_EDGE_TYPE,
      }

      onConnect(canvasEdgeConnection)
    },
    [onConnect]
  )

  useKeyboardShortcuts(flowInstance, { undo, redo })

  useEffect(() => {
    if (!templateImport || !flowInstance) {
      return
    }

    let addTemplateFrame = 0
    let fitViewFrame = 0

    flowInstance.setEdges([])
    flowInstance.setNodes([])

    addTemplateFrame = window.requestAnimationFrame(() => {
      flowInstance.setNodes(cloneTemplateNodes(templateImport.template))
      flowInstance.setEdges(cloneTemplateEdges(templateImport.template))

      fitViewFrame = window.requestAnimationFrame(() => {
        void flowInstance.fitView({
          duration: VIEWPORT_ANIMATION_DURATION,
          padding: 0.18,
        })
      })
    })

    return () => {
      window.cancelAnimationFrame(addTemplateFrame)
      window.cancelAnimationFrame(fitViewFrame)
    }
  }, [flowInstance, templateImport])

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
      edgeTypes={edgeTypes}
      onInit={handleInit}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
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
      <CanvasControlBar
        canRedo={canRedo}
        canUndo={canUndo}
        onFitView={handleFitView}
        onRedo={redo}
        onUndo={undo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
      <CanvasShapePanel
        onShapeDragStart={handleShapeDragStart}
        onShapeDragEnd={clearShapeDragPreview}
        onShapeInsert={handleShapeInsert}
      />
    </ReactFlow>
  )
}

interface CanvasControlBarProps {
  canRedo: boolean
  canUndo: boolean
  onFitView: () => void
  onRedo: () => void
  onUndo: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

function CanvasControlBar({
  canRedo,
  canUndo,
  onFitView,
  onRedo,
  onUndo,
  onZoomIn,
  onZoomOut,
}: CanvasControlBarProps) {
  return (
    <Panel position="bottom-left" className="pointer-events-auto !m-4 !mb-24">
      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-sidebar p-1.5 shadow-2xl backdrop-blur-xl">
        <CanvasControlButton label="Zoom out" onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </CanvasControlButton>
        <CanvasControlButton label="Fit view" onClick={onFitView}>
          <Maximize2 className="h-4 w-4" />
        </CanvasControlButton>
        <CanvasControlButton label="Zoom in" onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </CanvasControlButton>

        <span
          aria-hidden="true"
          className="mx-1 h-6 w-px bg-surface-border"
        />

        <CanvasControlButton
          disabled={!canUndo}
          label="Undo"
          onClick={onUndo}
        >
          <Undo2 className="h-4 w-4" />
        </CanvasControlButton>
        <CanvasControlButton
          disabled={!canRedo}
          label="Redo"
          onClick={onRedo}
        >
          <Redo2 className="h-4 w-4" />
        </CanvasControlButton>
      </div>
    </Panel>
  )
}

interface CanvasControlButtonProps {
  children: ReactNode
  disabled?: boolean
  label: string
  onClick: () => void
}

function CanvasControlButton({
  children,
  disabled = false,
  label,
  onClick,
}: CanvasControlButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full text-copy-muted hover:bg-bg-subtle hover:text-copy-primary disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </Button>
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
