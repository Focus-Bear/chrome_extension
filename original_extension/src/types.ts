export enum ListType {
  BLOCKED_LIST = "blocked_list",
  RELAX_LIST = "relax_list"
}
export type RelaxListEntry = {
  URL: string;
  reason: string;
  duration: number;
};

// Example usage:
const entry: RelaxListEntry = {
  URL: "https://example.com",
  reason: "Relaxing music",
  duration: 60
};
