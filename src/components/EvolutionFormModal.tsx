import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Input, Typography } from 'antd';
import type { EvolutionStep } from '../types';

interface StepFormValues {
  offset: number;
  name: string;
  description: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  item?: EvolutionStep;
  onSave: (values: StepFormValues) => void;
}

const EvolutionFormModal: React.FC<Props> = ({ open, onClose, mode, item, onSave }) => {
  const [form] = Form.useForm<StepFormValues>();

  const title = mode === 'create' ? 'Create New Step' : 'Edit Step';
  const okText = mode === 'create' ? 'Create' : 'Save';

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && item) {
        form.setFieldsValue(item);
      } else {
        form.resetFields();
        form.setFieldsValue({ offset: 0, name: '', description: '' });
      }
    }
  }, [open, mode, item, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSave(values);
      onClose();
    });
  };

  return (
    <Modal
      title={<Typography.Text strong>{title}</Typography.Text>}
      open={open}
      onOk={handleOk}
      onCancel={() => { form.resetFields(); onClose(); }}
      okText={okText}
      width={480}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ offset: 0, name: '', description: '' }}
      >
        <Form.Item
          name="offset"
          label="Offset"
          required
          rules={[{ required: true, message: 'Required' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder="Position on the graph line (from start)" />
        </Form.Item>

        <Form.Item
          name="name"
          label="Name"
          required
          rules={[{ required: true, message: 'Required' }]}
        >
          <Input maxLength={40} showCount placeholder="Short name displayed on the graph" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          required
          rules={[{ required: true, message: 'Required' }]}
        >
          <Input.TextArea maxLength={120} showCount rows={3} placeholder="Tooltip / title text shown for this step" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export type { StepFormValues };
export default EvolutionFormModal;
