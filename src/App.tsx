import React, { useState } from 'react';
import { Layout, Typography, Space, Card, Row, Col, Select } from 'antd';
import { ExperimentOutlined, ThunderboltOutlined, SwapOutlined } from '@ant-design/icons';
import SporeGraphAntd from './components/SporeGraphAntd';
import { sampleItems, evolutionTags } from './data/sampleData';
import { useTheme } from './contexts/theme';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const App: React.FC = () => {
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [speed, setSpeed] = useState<number>(35);
  const { theme, toggleTheme } = useTheme();

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <Space size="large">
            <ExperimentOutlined style={{ fontSize: '28px' }} />
            <Title level={3} style={{ margin: 0 }}>
              Evolution Graph
            </Title>
          </Space>
          <Space>
            <Text className="theme-label">Theme:</Text>
            <Select
              value={theme}
              onChange={() => toggleTheme()}
              style={{ width: 120 }}
              options={[
                { value: 'light', label: (
                  <span><SwapOutlined /> Light</span>
                )},
                { value: 'dark', label: (
                  <span><SwapOutlined /> Dark</span>
                )},
              ]}
            />
          </Space>
        </div>
      </Header>

      <Content className="app-content">
        <div className="content-wrapper">
          <Card className="controls-card" variant='borderless'>
            <Row gutter={[24, 16]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Space>
                  <ThunderboltOutlined />
                  <Text>Direction:</Text>
                  <Select
                    value={direction}
                    onChange={(value) => setDirection(value)}
                    style={{ width: 120 }}
                    options={[
                      { value: 'horizontal', label: '↔ Horizontal' },
                      { value: 'vertical', label: '↕ Vertical' },
                    ]}
                  />
                </Space>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Space>
                  <Text>Speed:</Text>
                  <Select
                    value={speed}
                    onChange={(value) => setSpeed(value)}
                    style={{ width: 100 }}
                    options={[
                      { value: 20, label: 'Slow' },
                      { value: 35, label: 'Medium' },
                      { value: 50, label: 'Fast' },
                    ]}
                  />
                </Space>
              </Col>
              <Col xs={24} md={12}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  💡 Hover over nodes to see details • Auto-scroll pauses on hover
                </Text>
              </Col>
            </Row>
          </Card>

          <SporeGraphAntd
            items={sampleItems}
            corner={evolutionTags}
            scrollDirection={direction}
            autoScrollSpeed={speed}
          />
        </div>
      </Content>

      <Footer className="app-footer">
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Inspired by Spore™ Evolution Game • Built with React + Ant Design
        </Text>
      </Footer>
    </Layout>
  );
};

export default App;
