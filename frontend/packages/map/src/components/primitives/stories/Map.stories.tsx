import type { Meta, StoryObj } from "@storybook/react-vite";
import { Map } from "../Map";
import { GeoJSONLayer } from "../../layers/GeoJSONLayer";
import { NavigationControl } from "../NavigationControl";
import { ScaleControl } from "../../controls/ScaleControl";

const meta: Meta<typeof Map> = {
  title: "Primitives/Map",
  component: Map,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    initialViewState: {
      description: "Initial map viewport",
      control: "object",
    },
    style: {
      description: "Map style URL",
      control: "text",
    },
    terrain: {
      description: "Enable 3D terrain",
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Map>;

export const Default: Story = {
  args: {
    initialViewState: {
      longitude: -122.4,
      latitude: 37.8,
      zoom: 10,
    },
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
  render: (args) => (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map {...args}>
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" />
      </Map>
    </div>
  ),
};

export const WithTerrain: Story = {
  args: {
    initialViewState: {
      longitude: -122.4,
      latitude: 37.8,
      zoom: 12,
      pitch: 60,
    },
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    terrain: true,
    terrainExaggeration: 1.5,
  },
  render: (args) => (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map {...args}>
        <NavigationControl position="top-right" />
      </Map>
    </div>
  ),
};

export const WithGeoJSON: Story = {
  args: {
    initialViewState: {
      longitude: -122.4,
      latitude: 37.8,
      zoom: 12,
    },
  },
  render: (args) => (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map {...args}>
        <GeoJSONLayer
          data={{
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [-122.45, 37.78],
                      [-122.35, 37.78],
                      [-122.35, 37.82],
                      [-122.45, 37.82],
                      [-122.45, 37.78],
                    ],
                  ],
                },
                properties: { name: "Test Area" },
              },
            ],
          }}
          type="fill"
          paint={{
            "fill-color": "#3b82f6",
            "fill-opacity": 0.5,
          }}
          hoverable
        />
        <NavigationControl position="top-right" />
      </Map>
    </div>
  ),
};

export const DarkMode: Story = {
  args: {
    initialViewState: {
      longitude: -122.4,
      latitude: 37.8,
      zoom: 10,
    },
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  render: (args) => (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map {...args}>
        <NavigationControl position="top-right" />
      </Map>
    </div>
  ),
};
