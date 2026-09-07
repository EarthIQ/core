import { Modal } from "@packages/ui";
import { Download, Image, Video } from "lucide-react";
import { type Map } from "maplibre-gl";
import { useState } from "react";

import { ControlButton, ControlButtonFlyout } from "../MapControlButton";
import ImageExport from "./ImageExport";
import { VideoExportPanel } from "./VideoExport/VideoExportPanel";

export const ExportControl = ({
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
}) => {
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
        flyoutGap={8}
        flyoutSide="left"
        icon={<Download className="h-4 w-4" />}
        label={label?.export || "Export"}
      >
        <ControlButton
          active={isImageExportOpen}
          className={className}
          icon={<Image className="h-4 w-4" />}
          label={label?.image || "Export Image"}
          onClick={() => setIsImageExportOpen(true)}
        />
        <ControlButton
          active={videoOpen}
          className={className}
          icon={<Video className="h-4 w-4" />}
          label={label?.video || "Export Video"}
          onClick={handleVideoToggle}
        />
      </ControlButtonFlyout>
      <Modal
        closeOnEscape
        closeOnOverlayClick
        className="m-0 flex h-[100dvh] max-h-none w-[100dvw] max-w-none flex-col overflow-hidden rounded-none p-0"
        isOpen={isImageExportOpen}
        showCloseButton={false}
        size="full"
        onClose={() => setIsImageExportOpen(false)}
      >
        <ImageExport
          map={map}
          onClose={() => setIsImageExportOpen(false)}
        />
      </Modal>
      {videoOpen && isVideoExportOpen === undefined ? <VideoExportPanel /> : null}
    </>
  );
}
