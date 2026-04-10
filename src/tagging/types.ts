export type TagGroups = Record<string, number[]>;

export interface CreateTagPayload {
  stat: string;
  timeMs?: number;
}

export type TagMutation = "add" | "clear" | "replace";

export interface TagUpdateEvent {
  tags: TagGroups;
  mutation: TagMutation;
}
