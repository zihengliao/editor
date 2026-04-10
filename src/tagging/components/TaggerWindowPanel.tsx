import { useCallback } from "react";
import { TagForm } from "./TagForm";
import { TagList } from "./TagList";
import { useTagsController } from "../hooks/useTagsController";

export function TaggerWindowPanel() {
  const { tags, addTag } = useTagsController();

  const handleAddTag = useCallback(
    (stat: string) => {
      // Tagger window relies on the latest edited playhead time
      // tracked by the main editor window.
      void addTag({ stat });
    },
    [addTag],
  );

  return (
    <div className="grid gap-3">
      <TagForm onAddTag={handleAddTag} />
      <TagList tags={tags} />
    </div>
  );
}
