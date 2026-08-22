import { useState } from "react";
import { FORMATS, INGESTED_FORMATS, STORED_FORMATS } from "./constants";
import { formatIcon } from "./helpers";

interface Props {
  onAddData?: () => void;
}

/**
 * "Supported Formats" card — a reference panel listing every format the
 * platform accepts, what extension each corresponds to, and whether the
 * platform ingests it as a queryable layer or stores it as a downloadable
 * asset.
 */
export default function SupportedFormats({ onAddData }: Props) {
  const [open, setOpen] = useState(true);

  const ingestedCount = FORMATS.filter((f) =>
    INGESTED_FORMATS.has(f.value),
  ).length;
  const storedCount = FORMATS.filter((f) => STORED_FORMATS.has(f.value)).length;

  return (
    <section
      className="card overflow-hidden"
      aria-labelledby="supported-formats-heading"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">🧩</span>
          <div className="min-w-0 text-left">
            <h2
              id="supported-formats-heading"
              className="text-base font-bold text-text-primary"
            >
              Supported Formats
            </h2>
            <div className="text-xs text-text-tertiary">
              {FORMATS.length} formats · {ingestedCount} ingested as queryable
              layers · {storedCount} stored as downloadable assets
            </div>
          </div>
        </div>
        <span
          className={`text-text-tertiary transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="border-t border-border-secondary">
          <div className="overflow-x-auto">
            <table className="table text-sm w-full">
              <thead className="bg-bg-tertiary">
                <tr>
                  <th className="text-left px-4 py-2">
                    <span className="text-[0.65rem] font-semibold text-text-tertiary uppercase tracking-wide">
                      Format
                    </span>
                  </th>
                  <th className="text-left px-4 py-2">
                    <span className="text-[0.65rem] font-semibold text-text-tertiary uppercase tracking-wide">
                      Extensions
                    </span>
                  </th>
                  <th className="text-left px-4 py-2">
                    <span className="text-[0.65rem] font-semibold text-text-tertiary uppercase tracking-wide">
                      Handled As
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FORMATS.map((f) => {
                  const ingested = INGESTED_FORMATS.has(f.value);
                  const stored = STORED_FORMATS.has(f.value);
                  const isCsv = f.value === "CSV";
                  return (
                    <tr
                      key={f.value}
                      className="hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base shrink-0">
                            {formatIcon(f.value)}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-text-primary text-sm">
                              {f.label}
                            </div>
                            {isCsv && (
                              <div className="text-[0.65rem] text-text-tertiary">
                                Ingested as a queryable layer when a coordinate
                                pair is detected
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-secondary text-text-secondary">
                          {f.extensions}
                        </code>
                      </td>
                      <td className="px-4 py-2.5">
                        {ingested ? (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">
                            <span aria-hidden>✓</span> Ingested
                          </span>
                        ) : stored ? (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-info/10 text-info border border-info/30">
                            <span aria-hidden>⬇</span> Stored asset
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">
                            <span aria-hidden>⚙</span> Conditionally ingested
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-border-secondary flex flex-wrap items-center justify-between gap-3">
            <div className="text-[0.7rem] text-text-tertiary max-w-2xl">
              Ingested layers are served as Mapbox Vector Tiles (MVT) and can be
              queried directly. Stored assets are kept on disk and available for
              download or further processing.
            </div>
            {onAddData && (
              <button
                onClick={onAddData}
                className="btn btn-secondary btn-sm shrink-0"
              >
                + Upload a new dataset
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
