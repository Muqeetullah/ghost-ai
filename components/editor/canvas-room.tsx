"use client"

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type ErrorInfo,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { shallow } from "@liveblocks/client"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  useCanRedo,
  useCanUndo,
  useOthers,
  useRedo,
  useUndo,
  useUpdateMyPresence,
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
  type OnDelete,
  type ReactFlowInstance,
  useReactFlow,
  useEdges,
  useNodes,
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
import {
  type CanvasSaveStatus,
  useCanvasAutosave,
} from "@/hooks/use-canvas-autosave"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  type CanvasEdge,
  type CanvasNode,
  type CanvasSnapshot,
} from "@/types/canvas"
import {
  cloneTemplateEdges,
  cloneTemplateNodes,
  type CanvasTemplateImport,
} from "@/components/editor/starter-templates"
import { clerkUserButtonAppearance } from "@/lib/clerk-appearance"
import { cn } from "@/lib/utils"

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
  onSaveNowChange: (saveNow: (() => void) | null) => void
  onSaveStatusChange: (status: CanvasSaveStatus) => void
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

export function CanvasRoom({
  onSaveNowChange,
  onSaveStatusChange,
  roomId,
  templateImport,
}: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
      >
        <CanvasErrorBoundary key={roomId} fallback={<CanvasErrorState />}>
          <ClientSideSuspense fallback={<CanvasLoadingState />}>
            {() => (
              <CanvasFlow
                onSaveNowChange={onSaveNowChange}
                onSaveStatusChange={onSaveStatusChange}
                projectId={roomId}
                templateImport={templateImport}
              />
            )}
          </ClientSideSuspense>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

interface CanvasFlowProps {
  onSaveNowChange: (saveNow: (() => void) | null) => void
  onSaveStatusChange: (status: CanvasSaveStatus) => void
  projectId: string
  templateImport: CanvasTemplateImport | null
}

function CanvasFlow({
  onSaveNowChange,
  onSaveStatusChange,
  projectId,
  templateImport,
}: CanvasFlowProps) {
  const flowInstanceRef =
    useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null)
  const nodeCounterRef = useRef(0)
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null)
  const [shapeDragPreview, setShapeDragPreview] =
    useState<ShapeDragPreview | null>(null)
  const [hasCheckedSavedCanvas, setHasCheckedSavedCanvas] = useState(false)
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const updateMyPresence = useUpdateMyPresence()
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
  const isAutosaveEnabled =
    hasCheckedSavedCanvas || nodes.length > 0 || edges.length > 0
  const { saveNow, status: saveStatus } = useCanvasAutosave({
    edges,
    enabled: isAutosaveEnabled,
    nodes,
    projectId,
  })

  useEffect(() => {
    onSaveStatusChange(saveStatus)
  }, [onSaveStatusChange, saveStatus])

  useEffect(() => {
    onSaveNowChange(saveNow)

    return () => {
      onSaveNowChange(null)
    }
  }, [onSaveNowChange, saveNow])

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

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect()

      updateMyPresence({
        cursor: {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        },
      })
    },
    [updateMyPresence]
  )

  const handleMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null })
  }, [updateMyPresence])

  useKeyboardShortcuts(flowInstance, { undo, redo })

  useEffect(() => {
    return () => {
      updateMyPresence({ cursor: null })
    }
  }, [updateMyPresence])

  useEffect(() => {
    if (!flowInstance || hasCheckedSavedCanvas) {
      return
    }

    if (nodes.length > 0 || edges.length > 0) {
      return
    }

    let isCancelled = false
    let fitViewFrame = 0

    async function loadSavedCanvas() {
      try {
        const response = await fetch(`/api/projects/${projectId}/canvas`)

        if (!response.ok) {
          throw new Error("Canvas load failed")
        }

        const savedCanvas = readSavedCanvasResponse(await response.json())
        const currentFlowInstance = flowInstanceRef.current

        if (isCancelled || !savedCanvas || !currentFlowInstance) {
          return
        }

        if (
          currentFlowInstance.getNodes().length > 0 ||
          currentFlowInstance.getEdges().length > 0
        ) {
          return
        }

        currentFlowInstance.setNodes(savedCanvas.nodes)
        currentFlowInstance.setEdges(savedCanvas.edges)

        if (savedCanvas.nodes.length > 0 || savedCanvas.edges.length > 0) {
          fitViewFrame = window.requestAnimationFrame(() => {
            void currentFlowInstance.fitView({
              duration: VIEWPORT_ANIMATION_DURATION,
              padding: 0.18,
            })
          })
        }
      } finally {
        if (!isCancelled) {
          setHasCheckedSavedCanvas(true)
        }
      }
    }

    void loadSavedCanvas()

    return () => {
      isCancelled = true
      window.cancelAnimationFrame(fitViewFrame)
    }
  }, [
    edges.length,
    flowInstance,
    hasCheckedSavedCanvas,
    nodes.length,
    projectId,
  ])

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

      const centerPosition = flowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addShapeNode(payload, {
        x: centerPosition.x - payload.size.width / 2,
        y: centerPosition.y - payload.size.height / 2,
      })
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
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      connectionLineType={ConnectionLineType.SmoothStep}
      connectionMode={ConnectionMode.Loose}
      defaultEdgeOptions={defaultEdgeOptions}
      deleteKeyCode={null}
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
      <CanvasPresenceGroup />
      <CanvasLiveCursors />
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
      <CanvasDeleteSelectionHandler
        onDelete={onDelete}
      />
    </ReactFlow>
  )
}

interface CanvasDeleteSelectionHandlerProps {
  onDelete: OnDelete<CanvasNode, CanvasEdge>
}

function CanvasDeleteSelectionHandler({
  onDelete,
}: CanvasDeleteSelectionHandlerProps) {
  const renderedNodes = useNodes<CanvasNode>()
  const renderedEdges = useEdges<CanvasEdge>()
  const { getEdges, getNodes } = useReactFlow<CanvasNode, CanvasEdge>()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.key !== "Delete" && event.key !== "Backspace") ||
        isEditableTarget(event.target)
      ) {
        return
      }

      const selectedNodes = getNodes().filter((node) => node.selected)
      const selectedEdgesFromState = getEdges().filter((edge) => edge.selected)
      const nodesToRemove =
        selectedNodes.length > 0
          ? selectedNodes
          : renderedNodes.filter((node) => node.selected)
      const edgesToRemove =
        selectedEdgesFromState.length > 0
          ? selectedEdgesFromState
          : renderedEdges.filter((edge) => edge.selected)
      const selectedNodeIds = new Set(nodesToRemove.map((node) => node.id))
      const edgeIdsToRemove = new Set(edgesToRemove.map((edge) => edge.id))
      const selectedEdges = getEdges().filter(
        (edge) =>
          edgeIdsToRemove.has(edge.id) ||
          selectedNodeIds.has(edge.source) ||
          selectedNodeIds.has(edge.target)
      )

      if (nodesToRemove.length === 0 && selectedEdges.length === 0) {
        return
      }

      event.preventDefault()
      onDelete({
        edges: selectedEdges,
        nodes: nodesToRemove,
      })
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    getEdges,
    getNodes,
    onDelete,
    renderedEdges,
    renderedNodes,
  ])

  return null
}

function readSavedCanvasResponse(value: unknown): CanvasSnapshot | null {
  if (!isRecord(value) || !isCanvasSnapshot(value.canvas)) {
    return null
  }

  return value.canvas
}

function isCanvasSnapshot(value: unknown): value is CanvasSnapshot {
  return (
    isRecord(value) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  )
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable ||
    target.closest("[contenteditable='true']") !== null
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

interface CollaboratorPresence {
  avatar: string
  color: string
  connectionId: number
  cursor: Liveblocks["Presence"]["cursor"]
  id: string
  name: string
}

function CanvasPresenceGroup() {
  const { user } = useUser()
  const currentUserId = user?.id ?? null
  const collaborators = useOthers(
    (others) =>
      others
        .filter((other) => other.id !== currentUserId)
        .map((other) => ({
          avatar: other.info.avatar,
          color: other.info.color,
          connectionId: other.connectionId,
          cursor: other.presence.cursor,
          id: other.id,
          name: other.info.name,
        })),
    shallow
  )
  const visibleCollaborators = collaborators.slice(0, 5)
  const overflowCount = Math.max(collaborators.length - visibleCollaborators.length, 0)

  return (
    <Panel position="top-right" className="pointer-events-auto !m-4">
      <div className="flex items-center rounded-full border border-surface-border bg-sidebar px-2 py-1.5 shadow-2xl backdrop-blur-xl">
        {visibleCollaborators.length > 0 ? (
          <div className="flex -space-x-2">
            {visibleCollaborators.map((collaborator) => (
              <CollaboratorAvatar
                key={collaborator.connectionId}
                collaborator={collaborator}
              />
            ))}
            {overflowCount > 0 ? (
              <div
                className="relative z-0 flex h-8 min-w-8 items-center justify-center rounded-full border border-surface-border bg-bg-elevated px-2 text-xs font-semibold text-copy-secondary ring-2 ring-bg-base"
                aria-label={`${overflowCount} more collaborators present`}
              >
                +{overflowCount}
              </div>
            ) : null}
          </div>
        ) : null}

        {collaborators.length > 0 ? (
          <span
            aria-hidden="true"
            className="mx-2 h-6 w-px bg-surface-border"
          />
        ) : null}

        <UserButton
          appearance={clerkUserButtonAppearance}
          userProfileMode="modal"
        />
      </div>
    </Panel>
  )
}

interface CollaboratorAvatarProps {
  collaborator: CollaboratorPresence
}

function CollaboratorAvatar({ collaborator }: CollaboratorAvatarProps) {
  const initials = getInitials(collaborator.name)

  return (
    <div
      className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-bg-elevated text-xs font-semibold text-copy-primary ring-2 ring-bg-base"
      aria-label={`${collaborator.name} is present`}
      title={collaborator.name}
    >
      {collaborator.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={collaborator.avatar}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  )
}

function CanvasLiveCursors() {
  const { user } = useUser()
  const currentUserId = user?.id ?? null
  const cursors = useOthers(
    (others) =>
      others
        .filter((other) => other.id !== currentUserId && other.presence.cursor)
        .map((other) => ({
          avatar: other.info.avatar,
          color: other.info.color,
          connectionId: other.connectionId,
          cursor: other.presence.cursor,
          id: other.id,
          name: other.info.name,
        })),
    shallow
  )

  if (cursors.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {cursors.map((participant) =>
        participant.cursor ? (
          <ParticipantCursor
            key={participant.connectionId}
            participant={participant}
          />
        ) : null
      )}
    </div>
  )
}

interface ParticipantCursorProps {
  participant: CollaboratorPresence
}

function ParticipantCursor({ participant }: ParticipantCursorProps) {
  if (!participant.cursor) {
    return null
  }

  return (
    <div
      className="absolute flex items-start"
      style={{
        left: participant.cursor.x,
        top: participant.cursor.y,
      }}
    >
      <span
        aria-hidden="true"
        className="h-4 w-4"
        style={{
          backgroundColor: participant.color,
          clipPath: "polygon(0 0, 0 100%, 36% 72%, 58% 100%, 78% 90%, 56% 62%, 100% 62%)",
        }}
      />
      <span
        className={cn(
          "ml-1.5 mt-3 max-w-36 truncate rounded-full px-2 py-0.5",
          "text-xs font-medium leading-5 text-bg-base shadow-xl"
        )}
        style={{ backgroundColor: participant.color }}
      >
        {participant.name}
      </span>
    </div>
  )
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.at(0)?.toUpperCase() ?? "")
    .join("")

  return initials || "?"
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
