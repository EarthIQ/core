interface Props {
  onAddData: () => void;
}

export default function DataPageHeader({ onAddData }: Props) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
          Spatial Catalog
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-2.5">
          <span className="text-primary">📊</span> Data Hub
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary max-w-2xl">
          Upload, manage, and inspect every common geospatial format — GeoJSON,
          Shapefile, KML, GeoRSS, GeoTIFF/COG, GeoPackage, GeoParquet, and CSV.
        </p>
      </div>

      <button
        onClick={onAddData}
        className="btn btn-primary btn-md shrink-0 gap-2 bg-gradient-to-br from-primary to-info shadow-primary hover-lift"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Add Data
      </button>
    </div>
  );
}
