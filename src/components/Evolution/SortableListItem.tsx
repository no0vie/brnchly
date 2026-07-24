import React from 'react';
import type { EvolutionStep } from '../../types';
import { Space, Tag, Typography } from 'antd';
import { Popconfirm, Button } from 'antd';
import { GripIcon } from './GripIcon';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  id: string;
  step: EvolutionStep;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const SortableListItem: React.FC<Props> = ({ id, step, index, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    cursor: 'grab',
  };

  return (
    <li ref={setNodeRef} style={{ ...style, listStyle: 'none' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBlock: '6px',
          paddingInline: '8px',
          background: isDragging ? '#e6f4ff' : undefined,
          borderRadius: 6,
          border: isDragging ? '1px solid #91d5ff' : undefined,
        }}
      >
        <Space size={8} style={{ display: 'flex', alignItems: 'center' }}>
          {/* Drag handle */}
          <span {...attributes} {...listeners} style={{ display: 'inline-flex', cursor: 'grab', flexShrink: 0 }}>
            <GripIcon isDragging></GripIcon>
          </span>

          <Tag color="blue">{step.offset}</Tag>
          <Typography.Text strong>{step.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
            {step.description}
          </Typography.Text>
        </Space>

        {/* Actions (stop drag propagation) */}
        <span onClick={(e) => e.stopPropagation()}>
          <Popconfirm title="Remove this step?" onConfirm={() => onDelete(index)} okText="Yes" cancelText="No">
            <Button danger size="small">Delete</Button>
          </Popconfirm>
          <Button size="small" onClick={() => onEdit(index)}>Edit</Button>
        </span>
      </div>
    </li>
  );
};
