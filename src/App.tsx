import React, { useMemo, useState } from "react";
import { Layout, Typography, Space, Card, Select, Button, Segmented, Switch } from "antd";
import { ExperimentOutlined, SwapOutlined, SettingOutlined } from "@ant-design/icons";
import { observer } from "mobx-react-lite";
import { EvolutionGraphView } from "./renderer";
import {
  migrateLegacyEvolutionData,
  type EvolutionGraphMode,
  type EvolutionLayoutStrategy,
} from "./domain/evolutionGraph";
import { sampleItems } from "./data/sampleData";
import { demoGraphs } from "./data/demoGraphs";
import { useTheme } from "./contexts/theme";
import { EvolutionProvider } from "./contexts/evolutionProvider";
import { useEvolutionSteps } from "./contexts/useEvolutionSteps";
import "./App.css";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const EvolutionEditTrigger: React.FC = observer(() => {
  const { steps, toggleModal } = useEvolutionSteps();
  return (
    <Button icon={<SettingOutlined />} onClick={() => toggleModal(true)}>
      Edit EvolutionSteps ({steps.length})
    </Button>
  );
});

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { steps } = useEvolutionSteps();
  const classicGraph = useMemo(
    () => migrateLegacyEvolutionData(sampleItems, steps, { id: "classic-evolution", title: "Classic Evolution Graph" }),
    [steps],
  );
  const [mode, setMode] = useState<EvolutionGraphMode>("graph");
  const [demoId, setDemoId] = useState(demoGraphs[0].id);
  const selectedDemo = demoGraphs.find((demo) => demo.id === demoId) ?? demoGraphs[0];
  const graph = mode === "classic" ? classicGraph : selectedDemo;
  const defaultLayout: EvolutionLayoutStrategy = selectedDemo.stages?.length ? "stage-lane" : "horizontal-dag";
  const [layouts, setLayouts] = useState<Record<string, EvolutionLayoutStrategy>>({});
  const layout = layouts[selectedDemo.id] ?? defaultLayout;
  const [showLaneLabels, setShowLaneLabels] = useState(true);

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <Space size="middle">
            <ExperimentOutlined className="header-icon" />
            <Title level={3} style={{ margin: 0 }}>
              brnchly
            </Title>
          </Space>
          <Space>
            {mode === "classic" && <EvolutionEditTrigger />}
            <Select
              value={theme}
              onChange={() => toggleTheme()}
              aria-label="Theme"
              style={{ width: 112 }}
              options={[
                {
                  value: "light",
                  label: (
                    <span>
                      <SwapOutlined /> Light
                    </span>
                  ),
                },
                {
                  value: "dark",
                  label: (
                    <span>
                      <SwapOutlined /> Dark
                    </span>
                  ),
                },
              ]}
            />
          </Space>
        </div>
      </Header>

      <Content className="app-content">
        <div className="content-wrapper">
          <Card className="controls-card" variant="borderless">
            <div className="phase-controls">
              <Segmented
                value={mode}
                onChange={(value) => setMode(value as EvolutionGraphMode)}
                options={[
                  { value: "classic", label: "Classic Mode" },
                  { value: "graph", label: "Graph Mode" },
                ]}
              />
              {mode === "graph" ? (
                <>
                  <Select
                    value={demoId}
                    onChange={setDemoId}
                    aria-label="Demo graph"
                    options={demoGraphs.map((demo) => ({ value: demo.id, label: demo.title }))}
                    style={{ minWidth: 210 }}
                  />
                  {layout === "stage-lane" && (
                    <Space size="small">
                      <Text type="secondary">Lane labels</Text>
                      <Switch
                        aria-label="Show lane labels"
                        size="small"
                        checked={showLaneLabels}
                        onChange={setShowLaneLabels}
                      />
                    </Space>
                  )}
                  <Text type="secondary" className="mode-description">
                    Drag to pan · Wheel or pinch to zoom · Select a node for details
                  </Text>
                </>
              ) : (
                <Text type="secondary" className="mode-description">
                  Phase 1 UI remains available with its original scrolling and editor.
                </Text>
              )}
            </div>
          </Card>

          <EvolutionGraphView
            graph={graph}
            mode={mode}
            readonly
            theme={theme}
            autoplay={mode === "classic"}
            layout={layout}
            showLaneLabels={showLaneLabels}
            onLayoutChange={(next) => setLayouts((current) => ({ ...current, [selectedDemo.id]: next }))}
          />
        </div>
      </Content>

      <Footer className="app-footer">
        <Text type="secondary">Universal Evolution Graph Engine · React + TypeScript</Text>
      </Footer>
    </Layout>
  );
};

const AppWrapper: React.FC = () => (
  <EvolutionProvider>
    <AppContent />
  </EvolutionProvider>
);
export default AppWrapper;
