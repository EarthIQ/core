import React, { useState } from 'react';
import { useMap } from '../../hooks/useMap';
import { Card, Checkbox, Stack, Text, Slider } from '@packages/ui';

export interface LayerConfig {
  id: string;
  name: string;
  visible?: boolean;
  opacity?: number;
  group?: string;
  legend?: React.ReactNode;
}

export interface LayerSwitcherProps {
  /** Layer configurations */
  layers: LayerConfig[];
  /** Position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Show opacity controls */
  showOpacity?: boolean;
  /** Callback on layer visibility change */
  onVisibilityChange?: (layerId: string, visible: boolean) => void;
  /** Callback on layer opacity change */
  onOpacityChange?: (layerId: string, opacity: number) => void;
  /** Collapsible */
  collapsible?: boolean;
  /** Title */
  title?: string;
}

export const LayerSwitcher: React.FC<LayerSwitcherProps> = ({
  layers,
  position = 'top-right',
  showOpacity = true,
  onVisibilityChange,
  onOpacityChange,
  collapsible = true,
  title = 'Layers'
}) => {
  const { map, isLoaded } = useMap();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [layerStates, setLayerStates] = useState<Record<string, { visible: boolean; opacity: number }>>(
    Object.fromEntries(layers.map(l => [l.id, { visible: l.visible ?? true, opacity: l.opacity ?? 1 }]))
  );

  const handleVisibilityChange = (layerId: string, visible: boolean) => {
    if (!map || !isLoaded) return;
    
    setLayerStates(prev => ({
      ...prev,
      [layerId]: { ...prev[layerId], visible }
    }));

    // Update map layer visibility
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }

    onVisibilityChange?.(layerId, visible);
  };

  const handleOpacityChange = (layerId: string, opacity: number) => {
    if (!map || !isLoaded) return;

    setLayerStates(prev => ({
      ...prev,
      [layerId]: { ...prev[layerId], opacity }
    }));

    // Update map layer opacity
    const layer = map.getLayer(layerId);
    if (layer) {
      const type = layer.type;
      const opacityProp = `${type}-opacity`;
      map.setPaintProperty(layerId, opacityProp, opacity);
    }

    onOpacityChange?.(layerId, opacity);
  };

  // Group layers
  const groupedLayers = layers.reduce((acc, layer) => {
    const group = layer.group || 'default';
    if (!acc[group]) acc[group] = [];
    acc[group].push(layer);
    return acc;
  }, {} as Record<string, LayerConfig[]>);

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 10, left: 10 },
    'top-right': { top: 10, right: 10 },
    'bottom-left': { bottom: 10, left: 10 },
    'bottom-right': { bottom: 10, right: 10 }
  };

  return (
    <Card
      style={{
        position: 'absolute',
        ...positionStyles[position],
        zIndex: 1000,
        minWidth: 200,
        maxHeight: '50vh',
        overflow: 'auto'
      }}
    >
      <Stack spacing="sm">
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: collapsible ? 'pointer' : 'default' }}
          onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        >
          <Text weight="bold">{title}</Text>
          {collapsible && (
            <span>{isCollapsed ? '▼' : '▲'}</span>
          )}
        </div>

        {!isCollapsed && Object.entries(groupedLayers).map(([group, groupLayers]) => (
          <div key={group}>
            {group !== 'default' && (
              <Text size="sm" color="muted" style={{ marginTop: 8 }}>{group}</Text>
            )}
            {groupLayers.map(layer => (
              <div key={layer.id} style={{ padding: '4px 0' }}>
                <Checkbox
                  checked={layerStates[layer.id]?.visible ?? true}
                  onChange={(e) => handleVisibilityChange(layer.id, e.target.checked)}
                  label={layer.name}
                />
                
                {showOpacity && layerStates[layer.id]?.visible && (
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={layerStates[layer.id]?.opacity ?? 1}
                    onChange={(value) => handleOpacityChange(layer.id, value)}
                    style={{ marginTop: 4, marginLeft: 24 }}
                  />
                )}
                
                {layer.legend && layerStates[layer.id]?.visible && (
                  <div style={{ marginLeft: 24, marginTop: 4 }}>
                    {layer.legend}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </Stack>
    </Card>
  );
};