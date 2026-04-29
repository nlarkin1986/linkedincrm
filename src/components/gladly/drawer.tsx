import { X } from "lucide-react";
import { Button } from "./button";

export function Drawer({
  children,
  title,
  open,
  onClose
}: {
  children: React.ReactNode;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close drawer"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        type="button"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <Button aria-label="Close" onClick={onClose} size="sm" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6">{children}</div>
      </aside>
    </div>
  );
}
