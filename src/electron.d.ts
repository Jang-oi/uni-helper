interface Window {
  electron: {
    send: (channel: string, data?: any) => void;
    receive: (channel: string, func: (...args: any[]) => void) => (() => void) | undefined;
    invoke: (channel: string, data?: any) => Promise<any>;
    checkSession: () => void;
    manualCheck: () => void;
    refreshSession: () => void;
  };
}
