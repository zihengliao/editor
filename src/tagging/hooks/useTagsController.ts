import { useCallback, useEffect, useState } from "react";
import type { CreateTagPayload, TagGroups, TagMutation } from "../types";

export function useTagsController() {
  const [tags, setTags] = useState<TagGroups>({});
  const [lastMutation, setLastMutation] = useState<TagMutation | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadInitialTags() {
      const result = await window.coachEditor.getTags();
      if (!isActive) {
        return;
      }

      setTags(result.tags);
    }

    void loadInitialTags();

    const unsubscribe = window.coachEditor.onTagsUpdated((payload) => {
      setTags(payload.tags);
      setLastMutation(payload.mutation);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const addTag = useCallback(async (payload: CreateTagPayload) => {
    await window.coachEditor.addTag(payload);
  }, []);

  const clearTags = useCallback(async () => {
    await window.coachEditor.clearTags();
  }, []);

  const replaceTags = useCallback(async (nextTags: TagGroups) => {
    await window.coachEditor.replaceTags(nextTags);
  }, []);

  const remapTagsAfterDeletedRange = useCallback(
    async (deletedStartMs: number, deletedEndMs: number) => {
      const deletedDurationMs = Math.max(0, deletedEndMs - deletedStartMs);
      if (deletedDurationMs <= 0) {
        return;
      }

      const nextTags: TagGroups = {};

      // Tags are stored in edited timeline time. After deleting a segment,
      // times inside that interval are dropped and later times shift left.
      for (const [label, times] of Object.entries(tags)) {
        const remappedTimes = times
          .filter((timeMs) => Number.isFinite(timeMs))
          .map((timeMs) => Math.floor(timeMs))
          .filter((timeMs) => timeMs < deletedStartMs || timeMs > deletedEndMs)
          .map((timeMs) =>
            timeMs > deletedEndMs ? timeMs - deletedDurationMs : timeMs,
          );

        if (remappedTimes.length > 0) {
          nextTags[label] = remappedTimes;
        }
      }

      await window.coachEditor.replaceTags(nextTags);
    },
    [tags],
  );

  return {
    tags,
    lastMutation,
    addTag,
    clearTags,
    replaceTags,
    remapTagsAfterDeletedRange,
  };
}
