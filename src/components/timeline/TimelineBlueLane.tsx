interface TimelineBlueLaneProps {
  className?: string;
}

export function TimelineBlueLane({ className }: TimelineBlueLaneProps) {
  return (
    <div
      className={
        className ??
        "h-full w-full border border-[#2a5b86] bg-gradient-to-r from-[#3d78aa] to-[#3f79ab]"
      }
    />
  );
}
