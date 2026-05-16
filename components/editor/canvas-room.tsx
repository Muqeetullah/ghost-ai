"use client"

import {
  Component,
  useCallback,
  useRef,
  type DragEvent,
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

import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import {
  CanvasShapePanel,
  hasShapeDragPayload,
  readShapeDragPayload,
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

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!hasShapeDragPayload(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    const payload = readShapeDragPayload(event.dataTransfer)
    const flowInstance = flowInstanceRef.current

    if (!payload || !flowInstance) {
      return
    }

    event.preventDefault()
    nodeCounterRef.current += 1

    const position = flowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

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
  }, [])

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
      <CanvasShapePanel />
    </ReactFlow>
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
