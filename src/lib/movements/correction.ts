export type Direction = "inbound" | "outbound";

export function oppositeDirection(direction: Direction): Direction {
  return direction === "inbound" ? "outbound" : "inbound";
}
