declare module 'vitalcamera-sdk/adapter' {
  type EventHandler = (payload: Record<string, unknown>) => void;
  type VitalCameraEvents = {
    on(event: string, handler: EventHandler): VitalCameraEvents;
    off(event: string, handler: EventHandler): VitalCameraEvents;
  };
  export default class BrowserAdapter {
    static loadModels(basePath?: string, options?: { emotion?: boolean; gaze?: boolean; faceLandmarker?: boolean }): Promise<Record<string, ArrayBuffer>>;
    constructor(config?: Record<string, unknown>);
    vitalcamera: VitalCameraEvents;
    init(): Promise<void>;
    start(): void;
    stop(): void;
    destroy(): Promise<void>;
  }
}
