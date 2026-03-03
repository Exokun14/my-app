interface ToastProps {
  msg: string;
  visible: boolean;
}

export default function Toast({ msg, visible }: ToastProps) {
  return (
    <div className={`toast${visible ? " show" : ""}`}>
      <div className="toast-dot" />
      <span>{msg}</span>
    </div>
  );
}
