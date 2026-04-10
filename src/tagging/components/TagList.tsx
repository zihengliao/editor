import type { TagGroups } from "../types";

interface TagListProps {
  tags: TagGroups;
  title?: string;
  emptyLabel?: string;
  className?: string;
  rowClassName?: string;
}

export function TagList({
  tags,
  title = "Tagged Events",
  emptyLabel = "No tags yet.",
  className,
  rowClassName = "h-8",
}: TagListProps) {
  const tagRows = Object.entries(tags);

  return (
    <section className={className ?? "rounded-lg border border-[#303743] bg-[#1a1f27] p-3"}>
      <h2 className="mb-2 text-sm font-semibold text-[#d8dee8]">{title}</h2>

        <div className="h-9" aria-hidden="true" />

      {tagRows.length === 0 ? (
        <p className="text-xs text-[#9aa4b3]">{emptyLabel}</p>
      ) : (
        <ol className="list-decimal list-inside overflow-hidden rounded border border-[#2a3140]">
          {tagRows.map(([label]) => (
            <li
              key={label}
              className={`flex items-center odd:bg-[#1f2530] even:bg-[#171c25] px-2 py-1 text-sm text-white ${rowClassName}`}
            >
              {label}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
