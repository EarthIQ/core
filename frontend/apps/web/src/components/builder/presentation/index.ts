/**
 * presentation/index.ts
 * ---------------------
 * Barrel for the project Presentation builder components. The shell page
 * (`pages/builders/PresentationBuilderPage.tsx`) imports from here.
 */
export * from "./types";
export { useDeckItem } from "./useDeckItem";
export { useProjectData, type ProjectData } from "./useProjectData";
export { buildDeckContext, type DeckShareContext } from "./share";
export { SlideCanvas, type BlockAction, type EditConfig } from "./SlideCanvas";
export { SlideThumb } from "./SlideThumb";
export { Inspector } from "./Inspector";
export { PresentMode } from "./PresentMode";
