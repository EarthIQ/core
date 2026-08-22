import { useEffect, useState } from "react";
import type { DatasetItem } from "./types";

interface Props {
  dataset: DatasetItem;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    name?: string;
    description?: string | null;
    source?: string | null;
    crs?: string;
    tags?: string[];
  }) => void;
}

export default function EditModal({ dataset, saving, onClose, onSave }: Props) {
  const [name, setName] = useState(dataset.name);
  const [desc, setDesc] = useState(dataset.description ?? "");
  const [source, setSource] = useState(dataset.source ?? "");
  const [crs, setCrs] = useState(dataset.crs);
  const [tags, setTags] = useState(dataset.tags?.join(", ") ?? "");

  // Re-sync when switching datasets
  useEffect(() => {
    setName(dataset.name);
    setDesc(dataset.description ?? "");
    setSource(dataset.source ?? "");
    setCrs(dataset.crs);
    setTags(dataset.tags?.join(", ") ?? "");
  }, [dataset]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name: name.trim() || undefined,
      description: desc.trim() || null,
      source: source.trim() || null,
      crs,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-md bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-border-primary shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Edit Dataset Metadata
            </h2>
            <div className="text-xs text-text-tertiary mt-0.5">
              {dataset.name}
            </div>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 flex flex-col gap-4 overflow-y-auto scrollbar-thin"
        >
          <div className="form-field">
            <label className="form-label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="What is this dataset?"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Source / Provenance</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="input"
              placeholder="e.g. Copernicus, USGS"
            />
          </div>

          <div className="form-field">
            <label className="form-label">CRS</label>
            <input
              type="text"
              value={crs}
              onChange={(e) => setCrs(e.target.value)}
              className="input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="input"
              placeholder="e.g. hydrology, elevation, 2026"
            />
          </div>

          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="btn btn-secondary btn-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-text-on-primary border-t-transparent animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
