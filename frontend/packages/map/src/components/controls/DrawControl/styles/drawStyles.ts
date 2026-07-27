// styles/drawStyles.ts

export const drawStyles = [
  // Polygon fill - active
  {
    id: "gl-draw-polygon-fill-active",
    type: "fill",
    filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "true"]],
    paint: {
      "fill-color": "#50aad1",
      "fill-opacity": 0.2,
    },
  },
  // Polygon fill - inactive
  {
    id: "gl-draw-polygon-fill-inactive",
    type: "fill",
    filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "false"]],
    paint: {
      "fill-color": "#50aad1",
      "fill-opacity": 0.1,
    },
  },
  // Polygon stroke - active
  {
    id: "gl-draw-polygon-stroke-active",
    type: "line",
    filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "true"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#50aad1",
      "line-width": 2.5,
    },
  },
  // Polygon stroke - inactive
  {
    id: "gl-draw-polygon-stroke-inactive",
    type: "line",
    filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "false"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#50aad1",
      "line-width": 2,
      "line-dasharray": [2, 2],
    },
  },
  // Line - active
  {
    id: "gl-draw-line-active",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#50aad1",
      "line-width": 2.5,
    },
  },
  // Line - inactive
  {
    id: "gl-draw-line-inactive",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["==", "active", "false"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#50aad1",
      "line-width": 2,
      "line-dasharray": [2, 2],
    },
  },
  // Vertex halo
  {
    id: "gl-draw-vertex-halo-active",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
    paint: {
      "circle-radius": 7,
      "circle-color": "#ffffff",
    },
  },
  // Vertex
  {
    id: "gl-draw-vertex-active",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
    paint: {
      "circle-radius": 5,
      "circle-color": "#50aad1",
    },
  },
  // Midpoint
  {
    id: "gl-draw-midpoint",
    type: "circle",
    filter: ["all", ["==", "meta", "midpoint"], ["==", "$type", "Point"]],
    paint: {
      "circle-radius": 4,
      "circle-color": "#50aad1",
      "circle-opacity": 0.8,
    },
  },
  // Point - active
  {
    id: "gl-draw-point-active",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "active", "true"],
      ["!=", "meta", "vertex"],
      ["!=", "meta", "midpoint"],
    ],
    paint: {
      "circle-radius": 8,
      "circle-color": "#50aad1",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  },
  // Point - inactive
  {
    id: "gl-draw-point-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "active", "false"],
      ["!=", "meta", "vertex"],
      ["!=", "meta", "midpoint"],
    ],
    paint: {
      "circle-radius": 6,
      "circle-color": "#50aad1",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  },
];
