import { useState } from "react";
import { Modal } from "@packages/ui";
import { ControlButton, ControlButtonFlyout } from "../MapControlButton";
import { Map } from "maplibre-gl";
import { Download, Image, Video } from "lucide-react";
import ImageExport from "./ImageExport";
import { VideoExportPanel } from "./VideoExport/VideoExportPanel";

export function ExportControl({
  map,
  className,
  isVideoExportOpen,
  onVideoExportToggle,
  label,
}: {
  map?: Map | null;
  className?: string;
  isVideoExportOpen?: boolean;
  onVideoExportToggle?: (isOpen: boolean) => void;
  label?: {
    export: string;
    image: string;
    video: string;
  };
}) {
  const [isImageExportOpen, setIsImageExportOpen] = useState(false);
  const [internalVideoExportOpen, setInternalVideoExportOpen] = useState(false);

  const videoOpen =
    isVideoExportOpen !== undefined
      ? isVideoExportOpen
      : internalVideoExportOpen;

  const handleVideoToggle = () => {
    if (onVideoExportToggle) {
      onVideoExportToggle(!videoOpen);
    } else {
      setInternalVideoExportOpen(!videoOpen);
    }
  };

  return (
    <>
      <ControlButtonFlyout
        icon={<Download className="h-4 w-4" />}
        label={label?.export || "Export"}
        flyoutSide="left"
        flyoutGap={8}
      >
        <ControlButton
          icon={<Image className="h-4 w-4" />}
          label={label?.image || "Export Image"}
          active={isImageExportOpen}
          onClick={() => setIsImageExportOpen(true)}
          className={className}
        />
        <ControlButton
          icon={<Video className="h-4 w-4" />}
          label={label?.video || "Export Video"}
          active={videoOpen}
          onClick={handleVideoToggle}
          className={className}
        />
      </ControlButtonFlyout>
      <Modal
        isOpen={isImageExportOpen}
        onClose={() => setIsImageExportOpen(false)}
        size="full"
        closeOnOverlayClick
        closeOnEscape
        showCloseButton={false}
        className="m-0 flex h-[100dvh] max-h-none w-[100dvw] max-w-none flex-col overflow-hidden rounded-none p-0"
      >
        <ImageExport
          map={map}
          onClose={() => setIsImageExportOpen(false)}
        />
      </Modal>
      {videoOpen && isVideoExportOpen === undefined && <VideoExportPanel />}
    </>
  );
}
