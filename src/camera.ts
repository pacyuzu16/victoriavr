// Bridge between the HTML camera-control cluster and Three's OrbitControls.
// A component inside <Canvas> registers imperative handlers; the HTML buttons call them.

export interface CameraHandlers {
  dolly: (factor: number) => void; // <1 zoom in, >1 zoom out
  orbit: (azimuth: number, polar: number) => void; // radians
  reset: () => void;
  toggleAuto: () => boolean; // returns new auto-rotate state
}

let H: CameraHandlers | null = null;
export const registerCamera = (h: CameraHandlers) => { H = h; };

export const cam = {
  zoomIn: () => H?.dolly(0.8),
  zoomOut: () => H?.dolly(1.25),
  orbitLeft: () => H?.orbit(-0.35, 0),
  orbitRight: () => H?.orbit(0.35, 0),
  orbitUp: () => H?.orbit(0, -0.28),
  orbitDown: () => H?.orbit(0, 0.28),
  reset: () => H?.reset(),
  toggleAuto: () => (H ? H.toggleAuto() : false),
};
