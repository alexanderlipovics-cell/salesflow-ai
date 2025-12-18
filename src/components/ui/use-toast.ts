type ToastOptions = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    const prefix = variant === 'destructive' ? '[ERROR]' : '[INFO]';
    if (variant === 'destructive') {
      console.error(`${prefix} ${title ?? ''} ${description ?? ''}`.trim());
    } else {
      console.log(`${prefix} ${title ?? ''} ${description ?? ''}`.trim());
    }
  };

  return { toast };
}
