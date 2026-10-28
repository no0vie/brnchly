import React, { memo } from "react";
import type { EvolutionNode } from "../../domain/evolutionGraph";
import type { Size } from "../../layout";

interface GraphNodeCardProps {
  node: EvolutionNode;
  color: string;
  position: { x: number; y: number };
  size: Size;
  selected: boolean;
  newlyRevealed: boolean;
  highlighted: boolean;
  dimmed: boolean;
  editingEnabled: boolean;
  connectionSource: boolean;
  connectionTarget: boolean;
  onSelect: (node: EvolutionNode) => void;
  onDragStart: (event: React.PointerEvent, node: EvolutionNode) => void;
  onConnectionStart: (event: React.PointerEvent, nodeId: string) => void;
  onConnectionStartKeyDown: (event: React.KeyboardEvent, nodeId: string) => void;
  onConnectionTarget: (event: React.PointerEvent, nodeId: string) => void;
  onConnectionTargetKeyDown: (event: React.KeyboardEvent, nodeId: string) => void;
}

export const GraphNodeCard = memo(function GraphNodeCard({
  node,
  color,
  position,
  size,
  selected,
  newlyRevealed,
  highlighted,
  dimmed,
  editingEnabled,
  connectionSource,
  connectionTarget,
  onSelect,
  onDragStart,
  onConnectionStart,
  onConnectionStartKeyDown,
  onConnectionTarget,
  onConnectionTargetKeyDown,
}: GraphNodeCardProps) {
  return (
    <div
      className={`universal-node-shell${connectionSource ? " is-connecting" : ""}${connectionTarget ? " is-connection-target" : ""}`}
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
      data-node-id={node.id}
    >
      <button
        type="button"
        className={`universal-node universal-node--${node.status}${selected ? " universal-node--selected" : ""}${newlyRevealed ? " universal-node--new" : ""}${highlighted ? " is-highlighted" : ""}${dimmed ? " is-dimmed" : ""}`}
        style={{ "--lane-color": color } as React.CSSProperties}
        onPointerDown={(event) => onDragStart(event, node)}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node);
        }}
        aria-label={`${node.title}. Status: ${node.status}`}
        title={node.description}
      >
        <span className="universal-node__icon" aria-hidden="true">
          {node.icon ?? "◆"}
        </span>
        <span className="universal-node__body">
          <strong>{node.title}</strong>
          {node.description && <small>{node.description}</small>}
        </span>
        <span className="universal-node__status">{node.status}</span>
      </button>
      {editingEnabled && (
        <button
          type="button"
          className="universal-node__port"
          aria-label={`Start connection from ${node.title}`}
          aria-pressed={connectionSource}
          title={`Start connection from ${node.title}`}
          onPointerDown={(event) => onConnectionStart(event, node.id)}
          onKeyDown={(event) => onConnectionStartKeyDown(event, node.id)}
        />
      )}
      {connectionTarget && (
        <button
          type="button"
          className="universal-node__target"
          aria-label={`Connect to ${node.title}`}
          onPointerUp={(event) => onConnectionTarget(event, node.id)}
          onKeyDown={(event) => onConnectionTargetKeyDown(event, node.id)}
        />
      )}
    </div>
  );
});
