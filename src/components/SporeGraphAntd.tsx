import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Progress, Card, Space, Tag, Tooltip, Badge } from 'antd';
import {
  ReloadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { GraphItem } from '../types';
import './SporeGraphAntd.css';

interface SporeGraphProps {
  items: GraphItem[];
  corner: string[];
  scrollDirection?: 'horizontal' | 'vertical';
  autoScrollSpeed?: number;
}

const SporeGraphAntd: React.FC<SporeGraphProps> = ({
  items,
  corner,
  scrollDirection = 'horizontal',
  autoScrollSpeed = 35,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const animationRef = useRef<number>();
  const lastTimestampRef = useRef<number>();

  const validatedItems = items.map(item => ({
    ...item,
    name: item.name.slice(0, 64),
    dif: Math.max(-10, Math.min(10, item.dif))
  }));

  const updateMaxScroll = useCallback(() => {
    if (containerRef.current) {
      if (scrollDirection === 'horizontal') {
        setMaxScroll(containerRef.current.scrollWidth - containerRef.current.clientWidth);
      } else {
        setMaxScroll(containerRef.current.scrollHeight - containerRef.current.clientHeight);
      }
    }
  }, [scrollDirection]);

  useEffect(() => {
    updateMaxScroll();
    window.addEventListener('resize', updateMaxScroll);
    return () => window.removeEventListener('resize', updateMaxScroll);
  }, [updateMaxScroll, validatedItems.length]);

  const scrollToStart = () => {
    if (containerRef.current) {
      if (scrollDirection === 'horizontal') {
        containerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setScrollPosition(0);
    }
  };

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const newPosition = scrollDirection === 'horizontal'
        ? containerRef.current.scrollLeft
        : containerRef.current.scrollTop;
      setScrollPosition(newPosition);
    }
  }, [scrollDirection]);

  const startAutoScroll = useCallback(() => {
    if (!isAutoScrolling) return;

    const animate = (timestamp: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = (timestamp - lastTimestampRef.current) / 1000;
      const scrollDelta = autoScrollSpeed * deltaTime;

      if (containerRef.current) {
        let newPosition;
        if (scrollDirection === 'horizontal') {
          newPosition = containerRef.current.scrollLeft + scrollDelta;
          if (newPosition >= maxScroll) {
            newPosition = maxScroll;
            setIsAutoScrolling(false);
          }
          containerRef.current.scrollLeft = newPosition;
        } else {
          newPosition = containerRef.current.scrollTop + scrollDelta;
          if (newPosition >= maxScroll) {
            newPosition = maxScroll;
            setIsAutoScrolling(false);
          }
          containerRef.current.scrollTop = newPosition;
        }
        setScrollPosition(newPosition);
      }

      lastTimestampRef.current = timestamp;
      if (isAutoScrolling) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isAutoScrolling, autoScrollSpeed, scrollDirection, maxScroll]);

  useEffect(() => {
    if (isAutoScrolling && maxScroll > 0 && scrollPosition < maxScroll) {
      startAutoScroll();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAutoScrolling, startAutoScroll, maxScroll, scrollPosition]);

  const toggleAutoScroll = () => {
    setIsAutoScrolling(!isAutoScrolling);
    if (!isAutoScrolling) {
      lastTimestampRef.current = undefined;
    }
  };

  const getItemPosition = (item: GraphItem, index: number) => {
    if (item.position) return item.position;

    // Determine positioning based on scroll direction
    if (scrollDirection === 'horizontal') {
      const spacing = 220;
      const x = index * spacing;
      const y = (item.dif + 10) * 15;
      return { x, y };
    }
    // vertical layout: stack items vertically with horizontal offset based on dif
    const spacingV = 180;
    const y = index * spacingV;
    const baseX = 150;
    const x = baseX + (item.dif + 10) * 15; // horizontal offset based on dif
    return { x, y };
  };

  const getCornerPositions = () => {
    const containerWidth = containerRef.current?.clientWidth || 800;

    if (scrollDirection === 'horizontal') {
      return corner.map((label, idx) => ({
        label,
        x: (idx * containerWidth * 0.6) + 50,
        y: Math.sin(idx * 0.7) * 60 + 100,
      }));
    } else {
      return corner.map((label, idx) => ({
        label,
        x: Math.cos(idx * 0.7) * 120 + 200,
        y: idx * 160 + 50,
      }));
    }
  };

  const getContainerStyle = () => ({
    overflow: 'auto',
    width: '100%',
    height: '550px',
    position: 'relative' as const,
    cursor: 'grab',
  });

  const getGraphStyle = () => {
    if (scrollDirection === 'horizontal') {
      return {
        display: 'flex',
        gap: '50px',
        padding: '40px',
        minWidth: `${validatedItems.length * 220}px`,
        height: '100%',
        position: 'relative' as const,
      };
    } else {
      return {
        position: 'relative' as const,
        height: `${validatedItems.length * 200}px`,
        width: '100%',
        padding: '20px',
      };
    }
  };

  const progressPercent = maxScroll > 0 ? (scrollPosition / maxScroll) * 100 : 0;

  return (
    <Card
      className="spore-graph-antd-container"
      bordered={false}
      bodyStyle={{ padding: '20px' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div className="controls-panel">
          <Space>
            <Tooltip title="Return to start">
              <Button
                icon={<ReloadOutlined />}
                onClick={scrollToStart}
                type="primary"
                ghost
              >
                Start
              </Button>
            </Tooltip>

            <Tooltip title={isAutoScrolling ? 'Pause auto-scroll' : 'Resume auto-scroll'}>
              <Button
                icon={isAutoScrolling ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={toggleAutoScroll}
                type={isAutoScrolling ? 'default' : 'primary'}
              >
                {isAutoScrolling ? 'Pause' : 'Resume'}
              </Button>
            </Tooltip>

            <Badge
              count={scrollDirection === 'horizontal' ? '↔️' : '↕️'}
              color="blue"
              style={{ fontSize: '14px' }}
            >
              <Tag color="geekblue" style={{ padding: '4px 12px' }}>
                {scrollDirection === 'horizontal' ? 'Horizontal' : 'Vertical'} Scroll
              </Tag>
            </Badge>
          </Space>
        </div>

        <div
          ref={containerRef}
          style={getContainerStyle()}
          onScroll={handleScroll}
          onMouseEnter={() => setIsAutoScrolling(false)}
          onMouseLeave={() => setIsAutoScrolling(true)}
          className="spore-graph-scroll-area"
        >
          <div style={getGraphStyle()} className="spore-graph-content">
            {getCornerPositions().map((cornerItem, idx) => (
              <div
                key={`corner-${idx}`}
                className="corner-marker-antd"
                style={{
                  position: 'absolute',
                  left: scrollDirection === 'horizontal' ? cornerItem.x : cornerItem.x,
                  top: scrollDirection === 'horizontal' ? cornerItem.y : cornerItem.y,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Tag color="cyan" className="corner-tag">
                  {cornerItem.label}
                </Tag>
              </div>
            ))}

            <svg className="connection-lines-antd" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {validatedItems.map((_, idx) => {
                if (idx === validatedItems.length - 1) return null;
                const pos1 = getItemPosition(validatedItems[idx], idx);
                const pos2 = getItemPosition(validatedItems[idx + 1], idx + 1);
                return (
                  <line
                    key={`line-${idx}`}
                    x1={pos1.x + 100}
                    y1={pos1.y + 60}
                    x2={pos2.x + 100}
                    y2={pos2.y + 60}
                    strokeWidth="2"
                    strokeDasharray="6,4"
                    className="connection-line-antd"
                  />
                );
              })}
            </svg>

            {validatedItems.map((item, index) => {
              const pos = getItemPosition(item, index);
              const nodeStyle = scrollDirection === 'horizontal'
                ? { marginLeft: pos.x, marginTop: pos.y }
                : { marginTop: pos.y, marginLeft: pos.x };

              return (
                <Card
                  key={`node-${index}`}
                  className={`graph-node-antd ${item.dif > 0 ? 'positive-node' : 'negative-node'}`}
                  style={nodeStyle}
                  hoverable
                  size="small"
                  bodyStyle={{ padding: '12px' }}
                >
                  <div className="node-glow-antd" />
                  <div className="node-content-antd">
                    <div className="node-name-antd">
                      <strong>{item.name}</strong>
                    </div>
                    <div className="node-dif-antd">
                      <Tag color={item.dif > 0 ? 'green' : 'red'} style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        {item.dif > 0 ? '+' : ''}{item.dif}
                      </Tag>
                    </div>
                    <div className="node-description-antd">
                      <small>{item.description}</small>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="scroll-progress-antd">
          <Progress
            percent={Math.round(progressPercent)}
            showInfo={false}
            strokeColor={{
              '0%': '#1890ff',
              '100%': '#722ed1',
            }}
          />
          <div className="scroll-info">
            <Space split={<span>|</span>}>
              <span>Position: {Math.round(scrollPosition)}px</span>
              <span>Max: {Math.round(maxScroll)}px</span>
              <span>Speed: {autoScrollSpeed}px/s</span>
            </Space>
          </div>
        </div>
      </Space>
    </Card>
  );
};

export default SporeGraphAntd;
