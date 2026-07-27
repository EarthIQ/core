import * as pmtiles from "pmtiles";

export interface PMTilesVectorLayer {
  id: string;
  fields: Record<string, string>;
  minzoom?: number;
  maxzoom?: number;
}

export interface PMTilesMetadata {
  vector_layers?: PMTilesVectorLayer[];
  [key: string]: any;
}

export const PMTilesUtils = {
  /**
   * Fetch PMTiles header and metadata
   */
  async getMetadata(url: string): Promise<{ header: pmtiles.Header; metadata: PMTilesMetadata }> {
    const pt = new pmtiles.PMTiles(url);
    const header = await pt.getHeader();
    const metadata = (await pt.getMetadata()) as PMTilesMetadata;
    return { header, metadata };
  },

  /**
   * Get sublayer IDs from PMTiles metadata
   */
  async getSublayers(url: string): Promise<string[]> {
    const { metadata } = await this.getMetadata(url);
    return metadata.vector_layers?.map((l) => l.id) || [];
  }
};

export default PMTilesUtils;
