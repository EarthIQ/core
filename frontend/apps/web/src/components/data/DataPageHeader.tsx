interface Props {
  onAddData: () => void;
}

export default function DataPageHeader({ onAddData }: Props) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <div className="text-primary mb-1.5 text-xs font-semibold tracking-widest uppercase">
          Spatial Catalog
        </div>
        <h1 className="text-text-primary flex items-center gap-2.5 text-2xl font-bold sm:text-3xl">
          <span className="text-primary">📊</span> Data Hub
        </h1>
        <p className="text-text-secondary mt-1.5 max-w-2xl text-sm">
          Upload, manage, and inspect every common geospatial format - GeoJSON,
          Shapefile, KML, GeoRSS, GeoTIFF/COG, GeoPackage, GeoParquet, and CSV.
        </p>
      </div>

      <button
        className="btn btn-primary btn-md from-primary to-info shadow-primary hover-lift shrink-0 gap-2 bg-gradient-to-br"
        onClick={onAddData}
      >
        <svg
          fill="none"
          height="16"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
          width="16"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line
            x1="12"
            x2="12"
            y1="3"
            y2="15"
          />
        </svg>
        Add Data
      </button>
    </div>
  );
}
