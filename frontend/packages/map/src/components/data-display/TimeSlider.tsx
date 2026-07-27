import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import { Slider, Button, Stack, Text } from '@packages/ui';

export interface TimeSliderProps {
  /** Minimum date/time */
  min: Date | number;
  /** Maximum date/time */
  max: Date | number;
  /** Current value */
  value?: Date | number;
  /** Time step in milliseconds */
  step?: number;
  /** Callback on value change */
  onChange?: (value: Date) => void;
  /** Filter property name in features */
  timeProperty?: string;
  /** Layer IDs to filter */
  layerIds?: string[];
  /** Date format function */
  formatDate?: (date: Date) => string;
  /** Enable playback controls */
  playback?: boolean;
  /** Playback speed in ms per step */
  playbackSpeed?: number;
  /** Show range slider */
  range?: boolean;
  /** Position */
  position?: 'top' | 'bottom';
  /** Aggregate mode (show all before current time) */
  cumulative?: boolean;
}

export const TimeSlider: React.FC<TimeSliderProps> = ({
  min,
  max,
  value: propValue,
  step = 86400000, // 1 day
  onChange,
  timeProperty = 'timestamp',
  layerIds = [],
  formatDate = (d) => d.toLocaleDateString(),
  playback = true,
  playbackSpeed = 500,
  range = false,
  position = 'bottom',
  cumulative = false
}) => {
  const { map, isLoaded } = useMap();
  const [value, setValue] = useState<number>(
    propValue instanceof Date ? propValue.getTime() : propValue || (min instanceof Date ? min.getTime() : min)
  );
  const [rangeValue, setRangeValue] = useState<[number, number]>([
    min instanceof Date ? min.getTime() : min,
    value
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number | null>(null);

  const minTime = min instanceof Date ? min.getTime() : min;
  const maxTime = max instanceof Date ? max.getTime() : max;

  // Apply time filter to layers
  const applyTimeFilter = useCallback((time: number | [number, number]) => {
    if (!map || !isLoaded) return;

    layerIds.forEach(layerId => {
      if (!map.getLayer(layerId)) return;

      let filter: any[];
      
      if (Array.isArray(time)) {
        // Range filter
        filter = [
          'all',
          ['>=', ['get', timeProperty], time[0]],
          ['<=', ['get', timeProperty], time[1]]
        ];
      } else if (cumulative) {
        // Show all before current time
        filter = ['<=', ['get', timeProperty], time];
      } else {
        // Show only at current time (with tolerance)
        filter = [
          'all',
          ['>=', ['get', timeProperty], time - step / 2],
          ['<', ['get', timeProperty], time + step / 2]
        ];
      }

      map.setFilter(layerId, filter);
    });
  }, [map, isLoaded, layerIds, timeProperty, step, cumulative]);

  // Handle value change
  const handleChange = useCallback((newValue: number | [number, number]) => {
    if (Array.isArray(newValue)) {
      setRangeValue(newValue);
      applyTimeFilter(newValue);
    } else {
      setValue(newValue);
      applyTimeFilter(newValue);
      onChange?.(new Date(newValue));
    }
  }, [applyTimeFilter, onChange]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= playbackSpeed) {
        setValue(prev => {
          const next = prev + step;
          if (next > maxTime) {
            setIsPlaying(false);
            return minTime;
          }
          applyTimeFilter(next);
          onChange?.(new Date(next));
          return next;
        });
        lastTime = currentTime;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, step, maxTime, minTime, applyTimeFilter, onChange]);

  // Initial filter application
  useEffect(() => {
    if (range) {
      applyTimeFilter(rangeValue);
    } else {
      applyTimeFilter(value);
    }
  }, []);

  const positionStyles: React.CSSProperties = position === 'bottom'
    ? { position: 'absolute', bottom: 20, left: 20, right: 20 }
    : { position: 'absolute', top: 20, left: 20, right: 20 };

  return (
    <div style={{ 
      ...positionStyles,
      background: 'white',
      borderRadius: 8,
      padding: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: 1000
    }}>
      <Stack spacing="sm">
        {/* Current time display */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text size="sm" color="muted">
            {formatDate(new Date(minTime))}
          </Text>
          <Text weight="bold">
            {range 
              ? `${formatDate(new Date(rangeValue[0]))} - ${formatDate(new Date(rangeValue[1]))}`
              : formatDate(new Date(value))
            }
          </Text>
          <Text size="sm" color="muted">
            {formatDate(new Date(maxTime))}
          </Text>
        </div>

        {/* Slider */}
        {range ? (
          <RangeSlider
            min={minTime}
            max={maxTime}
            step={step}
            value={rangeValue}
            onChange={handleChange}
          />
        ) : (
          <Slider
            min={minTime}
            max={maxTime}
            step={step}
            value={value}
            onChange={handleChange}
          />
        )}

        {/* Playback controls */}
        {playback && !range && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleChange(minTime)}
            >
              ⏮
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleChange(Math.max(minTime, value - step))}
            >
              ⏪
            </Button>
            <Button
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? '⏸' : '▶️'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleChange(Math.min(maxTime, value + step))}
            >
              ⏩
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleChange(maxTime)}
            >
              ⏭
            </Button>
          </div>
        )}
      </Stack>
    </div>
  );
};