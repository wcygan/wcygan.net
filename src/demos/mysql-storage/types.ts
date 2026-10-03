export interface ViewCommand {
  kind: "left" | "right" | "in" | "out" | "reset";
  revision: number;
}
export interface CameraPose {
  position: [number, number, number];
  zoomScale: number;
  revision: number;
}
