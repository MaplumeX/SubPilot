export type Toast = {
  id: number;
  title: string;
  message?: string;
  variant?: "default" | "destructive";
};

let listeners: Array<(toast: Toast) => void> = [];
let counter = 0;

export function toast(input: Omit<Toast, "id">) {
  const item: Toast = { id: ++counter, ...input };
  listeners.forEach((listener) => listener(item));
}

export function subscribe(listener: (toast: Toast) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}
