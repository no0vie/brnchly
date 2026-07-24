import React from 'react';
import type { EvolutionStep } from '../../types';
import { Tag, Typography } from 'antd';

export const StepInfo: React.FC<{ step: EvolutionStep }> = ({ step }) => (
  <>
    <Tag color="blue">{step.offset}</Tag>
    <Typography.Text strong>{step.name}</Typography.Text>
    <Typography.Text type="secondary" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
      {step.description}
    </Typography.Text>
  </>
);
