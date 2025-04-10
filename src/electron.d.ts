interface Response {
  success: boolean;
  message: string;
  data: Record<string, any>;
}

interface Electron {
  onShowNotification: (param: Record<string, any>) => Promise<Response>;
  onAutomationStatusChanged: (param: Record<string, any>) => Promise<Response>;
  getAutomationStatus: (param: Record<string, any>) => Promise<Response>;
  onShowNotification: (param: Record<string, any>) => Promise<Response>;
}

interface Window {
  electronAPI: Electron;
}
