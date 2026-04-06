import { useEffect, useRef } from "react";
import type { RecentVideo } from "../types";

interface FileMenuFormProps {
  isOpen: boolean;
  recentVideos: RecentVideo[];
  isProjectDirty: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenVideo: () => void;
  onImportProject: () => void;
  onSaveProject: () => void;
  onOpenRecent: (path: string) => void;
}

export function FileMenuForm({
  isOpen,
  recentVideos,
  isProjectDirty,
  onToggle,
  onClose,
  onOpenVideo,
  onImportProject,
  onSaveProject,
  onOpenRecent,
}: FileMenuFormProps) {
  const menuWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!isOpen) {
        return;
      }

      if (menuWrapRef.current?.contains(event.target as Node)) {
        return;
      }

      onClose();
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscapeKey);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative [app-region:no-drag]" ref={menuWrapRef}>
      <button
        type="button"
        className="rounded px-2 py-1 text-sm text-[#9aa4b3] hover:bg-transparent hover:text-white"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        File{isProjectDirty ? " *" : ""}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+4px)] z-20 min-w-56 overflow-hidden border border-[#303743] bg-[#1b2028] py-1 text-sm text-[#d8dee8] shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left hover:bg-[#2a3240]"
            onClick={onOpenVideo}
          >
            Open Video...
          </button>

          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left hover:bg-[#2a3240]"
            onClick={onImportProject}
          >
            Import Project...
          </button>

          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left hover:bg-[#2a3240]"
            onClick={onSaveProject}
          >
            Save Project
          </button>

          <div className="my-1 border-t border-[#303743]" />
          <p className="px-3 py-1 text-xs uppercase tracking-wide text-[#9aa4b3]">Open Recent</p>

          {recentVideos.length === 0 ? (
            <p className="px-3 py-1.5 text-[#9aa4b3]">No recent videos</p>
          ) : (
            recentVideos.map((recentVideo) => (
              <button
                key={recentVideo.path}
                type="button"
                role="menuitem"
                className="block w-full truncate px-3 py-1.5 text-left hover:bg-[#2a3240]"
                title={recentVideo.path}
                onClick={() => onOpenRecent(recentVideo.path)}
              >
                {recentVideo.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
