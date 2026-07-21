import React, { useState } from 'react';
import { Modal, List, Button, Space, Popconfirm, Typography, Tag } from 'antd';
import type { EvolutionStep } from '../types';
import EvolutionFormModal, { StepFormValues } from './EvolutionFormModal';

interface Props {
  open: boolean;
  onClose: () => void;
  steps: EvolutionStep[];
  addStep: (step: EvolutionStep) => void;
  updateStep: (index: number, updated: Partial<EvolutionStep>) => void;
  removeStep: (index: number) => void;
  resetToDefault: () => void;
}

type EditMode = 'create' | 'edit';

const EvolutionEditModal: React.FC<Props> = ({ open, onClose, steps, addStep, updateStep, removeStep, resetToDefault }) => {
  const [mode, setMode] = useState<EditMode>('create');
  const [formOpen, setFormOpen] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number>(-1);

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
            <List
              size="small"
              dataSource={steps.map((s, i) => ({ ...s, _index: i }))}
              locale={{ emptyText: 'No steps yet — click the button below to create one' }}
              renderItem={(item: EvolutionStep & { _index: number }) => (
                <List.Item style={{ justifyContent: 'space-between', alignItems: 'center', paddingBlock: '6px' }}>
                  <Space size={8}>
                    <Tag color="blue">{item.offset}</Tag>
                    <Typography.Text strong>{item.name}</Typography.Text>
                    <Typography.Text type="secondary" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
                      {item.description}
                    </Typography.Text>
                  </Space>
                  <Popconfirm title="Remove this step?" onConfirm={() => removeStep(item._index)} okText="Yes" cancelText="No">
                    <Button danger size="small">Delete</Button>
                  </Popconfirm>
                  <Button size="small" onClick={() => openEdit(item._index)}>Edit</Button>
                </List.Item>
              )}
            />
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
};

export default EvolutionEditModal;
