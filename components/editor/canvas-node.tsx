import { Handle, Position, type NodeProps } from "@xyflow/react"

import type { CanvasNode } from "@/types/canvas"

const HANDLE_POSITIONS = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const

export function CanvasNodeRenderer({
  data,
  isConnectable,
  selected,
}: NodeProps<CanvasNode>) {
  return (
    <div
      className="group relative flex h-full w-full items-center justify-center rounded-xl border px-4 py-3 text-center text-sm font-medium shadow-lg ring-brand/70 transition-[border-color,box-shadow]"
      style={{
        backgroundColor: data.color.fill,
        borderColor: selected ? data.color.text : "var(--border-subtle)",
        color: data.color.text,
        boxShadow: selected ? "0 0 0 2px var(--accent-primary-dim)" : undefined,
      }}
    >
      <span className="max-w-full truncate">{data.label}</span>

      {HANDLE_POSITIONS.map(({ id, position }) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={position}
          isConnectable={isConnectable}
          isConnectableStart={isConnectable}
          isConnectableEnd={isConnectable}
          className="!h-2 !w-2 !border !border-bg-base !bg-copy-primary !opacity-0 !transition-opacity group-hover:!opacity-100"
        />
      ))}
    </div>
  )
}
