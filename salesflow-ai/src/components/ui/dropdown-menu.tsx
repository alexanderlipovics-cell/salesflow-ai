import * as React from "react";

interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { open, setOpen });
        }
        return child;
      })}
    </div>
  );
}

export function DropdownMenuTrigger({ children, open, setOpen }: any) {
  return (
    <button
      onClick={() => setOpen?.(!open)}
      className="rounded p-2 hover:bg-slate-700"
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ children, open }: any) {
  if (!open) return null;

  return (
    <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-slate-700 bg-slate-800 shadow-lg">
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700"
    >
      {children}
    </button>
  );
}

