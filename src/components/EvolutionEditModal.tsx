import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, MeasuringStrategy } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Modal, Button, Space, Popconfirm, Typography } from 'antd';
import type { EvolutionStep } from '../types';
import EvolutionFormModal, { StepFormValues } from './EvolutionFormModal';
import { SortableListItem } from './Evolution/SortableListItem';

interface Props {
  open: boolean;
  onClose: () => void;
  steps: EvolutionStep[];
  addStep: (step: EvolutionStep) => void;
  updateStep: (index: number, updated: Partial<EvolutionStep>) => void;
  removeStep: (index: number) => void;
  resetToDefault: () => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;
}

type EditMode = 'create' | 'edit';

const EvolutionEditModal: React.FC<Props> = observer(({ open, onClose, steps, addStep, updateStep, removeStep, resetToDefault, reorderSteps }) => {
  const [mode, setMode] = useState<EditMode>('create');
  const [formOpen, setFormOpen] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number>(-1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: Parameters<NonNullable<React.ComponentProps<typeof DndContext>['onDragEnd']>>[0]) => {
    const { active, over } = event;
    if (!over) return;

    // Find the dragged element's original index in the array
    const fromIndex = steps.findIndex((s) => s.name === active.id);
    
    // Use multiple strategies to find target drop index
    let toIndex = -1;

    // Strategy 1: use overData.index (most reliable for sortable lists)
    const data = over.data as unknown as Record<string, unknown> | undefined;
    const overIndex = data ? Number(data.index) : NaN;
    if (!Number.isNaN(overIndex)) {
      toIndex = overIndex;
    }
    
    // Strategy 2: try matching by element ID
    if (toIndex === -1 && steps.some((s) => s.name === over.id)) {
      toIndex = steps.findIndex((s) => s.name === over.id);
    }

    // Validate indices
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    // Reorder and swap offsets
    reorderSteps(fromIndex, toIndex);
  };

  const openCreate = () => {
    setMode('create');
    setTargetIndex(-1);
    setFormOpen(true);
  };

  const openEdit = (index: number) => {
    setMode('edit');
    setTargetIndex(index);
    setFormOpen(true);
  };

  return (
    <>
      <Modal
        title="Evolution Steps"
        open={open}
        onCancel={onClose}
        maskClosable={false}
        width={600}
        footer={null}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Steps List */}
          <div>
            <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
              Steps ({steps.length})
            </Typography.Text>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              measuring={{
                droppable: { strategy: MeasuringStrategy.Always },
              }}
            >
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <SortableContext items={steps.map((s) => s.name)} strategy={verticalListSortingStrategy}>
                  {steps.length === 0 ? (
                    <span style={{ display: 'block', textAlign: 'center', padding: '24px 0', color: '#999' }}>
                      No steps yet — click the button below to create one
                    </span>
                  ) : (
                    steps.map((item, index) => (
                      <SortableListItem key={item.name} id={item.name} step={item} index={index} onEdit={openEdit} onDelete={removeStep} />
                    ))
                  )}
                </SortableContext>
              </ul>
            </DndContext>
          </div>

          {/* Single create button */}
          <div style={{ textAlign: 'center' }}>
            <Button type="dashed" onClick={openCreate} style={{ width: 240, fontSize: 14 }}>
              + Create New Step
            </Button>
          </div>

          {/* Reset to default */}
          {steps.length > 0 && (
            <div style={{ textAlign: 'center' }}>
              <Popconfirm title="Reset all steps to default?" onConfirm={() => { resetToDefault(); onClose(); }} okText="Reset" cancelText="Cancel">
                <Button size="small" type="text">Reset to Default</Button>
              </Popconfirm>
            </div>
          )}
        </Space>
      </Modal>

      {/* Form modal */}
      <EvolutionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={mode}
        item={mode === 'edit' ? steps[targetIndex] : undefined}
        onSave={(values: StepFormValues) => {
          if (mode === 'create') {
            addStep({ name: values.name, description: values.description, offset: values.offset || 0 });
          } else {
            updateStep(targetIndex, { name: values.name, description: values.description, offset: values.offset });
          }
          setFormOpen(false);
        }}
      />
    </>
  );
});

export default EvolutionEditModal;
