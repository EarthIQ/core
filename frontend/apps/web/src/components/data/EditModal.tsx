import { useEffect, useState } from "react";
import { Button, Input, Modal, ModalFooter, Textarea } from "@packages/ui";
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

export default function EditModal({
  dataset,
  saving,
  onClose,
  onSave,
}: Props) {
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
      onClose={() => !saving && onClose()}
      closeOnOverlayClick={!saving}
      title="Edit Dataset Metadata"
      description={dataset.name}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Textarea
          label="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="What is this dataset?"
          autoResize
        />
        <Input
          label="Source / Provenance"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. Copernicus, USGS"
        />
        <Input
          label="CRS"
          value={crs}
          onChange={(e) => setCrs(e.target.value)}
        />
        <Input
          label="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. hydrology, elevation, 2026"
        />

        <ModalFooter>
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => !saving && onClose()}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving} loadingText="Saving…">
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
