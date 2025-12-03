type ToastOptions = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    if (variant === 'destructive') {
      console.error(`[toast] ${title ?? ''} ${description ?? ''}`.trim());
    } else {
      console.log(`[toast] ${title ?? ''} ${description ?? ''}`.trim());
    }
  };

  return { toast };
}
type ToastPayload = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastPayload) => {
    const prefix = variant === "destructive" ? "⚠️" : "ℹ️";
    console.info(`${prefix} ${title}${description ? ` – ${description}` : ""}`);
  };

  return { toast };
}

