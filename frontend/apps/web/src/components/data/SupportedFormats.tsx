import { useState } from "react";

import { FORMATS, INGESTED_FORMATS, STORED_FORMATS } from "./constants";
import { formatIcon } from "./helpers";

interface Props {
  onAddData?: () => void;
}

/**
 * "Supported Formats" card - a reference panel listing every format the
 * platform accepts, what extension each corresponds to, and whether the
 * platform ingests it as a queryable layer or stores it as a downloadable
 * asset.
 */
export default function SupportedFormats({ onAddData }: Props) {
  const [open, setOpen] = useState(true);

  const ingestedCount = FORMATS.filter((f) =>
    INGESTED_FORMATS.has(f.value)
  ).length;
  const storedCount = FORMATS.filter((f) => STORED_FORMATS.has(f.value)).length;

  return (
    <section
      aria-labelledby="supported-formats-heading"
      className="card overflow-hidden"
    >
      <button
        aria-expanded={open}
        className="hover:bg-surface-hover flex w-full items-center justify-between px-5 py-4 transition-colors"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-xl">🧩</span>
          <div className="min-w-0 text-left">
            <h2
              className="text-text-primary text-base font-bold"
              id="supported-formats-heading"
            >
              Supported Formats
            </h2>
            <div className="text-text-tertiary text-xs">
              {FORMATS.length} formats · {ingestedCount} ingested as queryable
              layers · {storedCount} stored as downloadable assets
            </div>
          </div>
        </div>
        <span
          aria-hidden
          className={`text-text-tertiary transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {open ? (
        <div className="border-border-secondary border-t">
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead className="bg-bg-tertiary">
                <tr>
                  <th className="px-4 py-2 text-left">
                    <span className="text-text-tertiary text-[0.65rem] font-semibold tracking-wide uppercase">
                      Format
                    </span>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <span className="text-text-tertiary text-[0.65rem] font-semibold tracking-wide uppercase">
                      Extensions
                    </span>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <span className="text-text-tertiary text-[0.65rem] font-semibold tracking-wide uppercase">
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
                          <span className="shrink-0 text-base">
                            {formatIcon(f.value)}
                          </span>
                          <div className="min-w-0">
                            <div className="text-text-primary text-sm font-semibold">
                              {f.label}
                            </div>
                            {isCsv ? (
                              <div className="text-text-tertiary text-[0.65rem]">
                                Ingested as a queryable layer when a coordinate
                                pair is detected
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <code className="bg-bg-tertiary border-border-secondary text-text-secondary rounded border px-1.5 py-0.5 font-mono text-xs">
                          {f.extensions}
                        </code>
                      </td>
                      <td className="px-4 py-2.5">
                        {ingested ? (
                          <span className="bg-success/10 text-success border-success/30 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
                            <span aria-hidden>✓</span> Ingested
                          </span>
                        ) : stored ? (
                          <span className="bg-info/10 text-info border-info/30 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
                            <span aria-hidden>⬇</span> Stored asset
                          </span>
                        ) : (
                          <span className="bg-warning/10 text-warning border-warning/30 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
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

          <div className="border-border-secondary flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
            <div className="text-text-tertiary max-w-2xl text-[0.7rem]">
              Ingested layers are served as Mapbox Vector Tiles (MVT) and can be
              queried directly. Stored assets are kept on disk and available for
              download or further processing.
            </div>
            {onAddData ? (
              <button
                className="btn btn-secondary btn-sm shrink-0"
                onClick={onAddData}
              >
                + Upload a new dataset
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
