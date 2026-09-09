import { Map } from "../../primitives/Map";
import { BasemapSelector, PREDEFINED_BASEMAPS } from "../BasemapSelector";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof BasemapSelector> = {
  title: "Controls/BasemapSelector",
  component: BasemapSelector,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof BasemapSelector>;

export const Compact: Story = {
  render: () => (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map initialViewState={{ longitude: 0, latitude: 0, zoom: 2 }}>
        <BasemapSelector
          basemaps={PREDEFINED_BASEMAPS.slice(0, 6)}
          displayMode="compact"
          position="bottom-left"
        />
      </Map>
    </div>
  ),
};

export const Gallery: Story = {
  render: () => (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map initialViewState={{ longitude: 0, latitude: 0, zoom: 2 }}>
        <BasemapSelector
          groupByCategory
          basemaps={PREDEFINED_BASEMAPS}
          displayMode="gallery"
          position="top-right"
        />
      </Map>
    </div>
  ),
};

export const Dropdown: Story = {
  render: () => (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map initialViewState={{ longitude: 0, latitude: 0, zoom: 2 }}>
        <BasemapSelector
          basemaps={PREDEFINED_BASEMAPS}
          displayMode="dropdown"
          position="top-left"
        />
      </Map>
    </div>
  ),
};
