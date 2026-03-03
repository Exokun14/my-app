import { useState, useRef, useCallback } from "react";

interface UseToastReturn {
  msg: string;
  visible: boolean;
  toast: (message: string) => void;
}

export function useToast(): UseToastReturn {
  const [msg, setMsg] = useState<string>("");
  const [visible, setVisible] = useState<boolean>(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((message: string) => {
    setMsg(message);
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2800);
  }, []);

  return { msg, visible, toast };
}
