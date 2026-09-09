import { Button, Input, Modal, ModalFooter, Textarea } from "@packages/ui";
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
    <Modal
      isOpen
      closeOnOverlayClick={!saving}
      description={dataset.name}
      size="md"
      title="Edit Dataset Metadata"
      onClose={() => !saving && onClose()}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <Input
          required
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Textarea
          autoResize
          label="Description"
          placeholder="What is this dataset?"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <Input
          label="Source / Provenance"
          placeholder="e.g. Copernicus, USGS"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <Input
          label="CRS"
          value={crs}
          onChange={(e) => setCrs(e.target.value)}
        />
        <Input
          label="Tags (comma-separated)"
          placeholder="e.g. hydrology, elevation, 2026"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <ModalFooter>
          <Button
            disabled={saving}
            variant="ghost"
            onClick={() => !saving && onClose()}
          >
            Cancel
          </Button>
          <Button
            loading={saving}
            loadingText="Saving…"
            type="submit"
          >
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
