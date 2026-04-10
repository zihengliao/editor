interface TagFormProps {
  onAddTag: (stat: string) => void;
}

export function TagForm({ onAddTag }: TagFormProps) {
  return (
    <section className="grid gap-2 rounded-lg border border-[#303743] bg-[#1a1f27] p-3">
      <h2 className="text-sm font-semibold text-[#d8dee8]">Quick Tags</h2>

      <button
        type="button"
        className="cursor-pointer rounded border border-[#3a4352] bg-[#242a33] px-3 py-1.5 text-left text-sm text-white transition hover:bg-[#2f3744]"
        onClick={() => onAddTag("2 pts")}
      >
        2 pts
      </button>

      <button
        type="button"
        className="cursor-pointer rounded border border-[#3a4352] bg-[#242a33] px-3 py-1.5 text-left text-sm text-white transition hover:bg-[#2f3744]"
        onClick={() => onAddTag("3 pts")}
      >
        3 pts
      </button>
    </section>
  );
}
