import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export function DialogContent({
  children,
  className,
  showCloseButton = true,
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm
          data-[state=open]:animate-fade-in
          data-[state=closed]:animate-fade-out"
      />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          // Base positioning
          `fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2`,
          // Responsive width: full width with 1rem margin on each side
          `w-[calc(100%-2rem)] max-w-md`,
          // Height constraints using --vh for proper mobile viewport
          `max-h-[calc(var(--vh,1vh)*85-var(--safe-area-inset-top)-var(--safe-area-inset-bottom))]`,
          // Layout for scrollable content
          `flex flex-col overflow-hidden`,
          // Visual styling
          `bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-6`,
          `shadow-2xl shadow-black/20`,
          // Animations
          `data-[state=open]:animate-scale-in`,
          `data-[state=closed]:animate-scale-out`,
          `focus:outline-none`,
          className
        )}
      >
        {showCloseButton && (
          <DialogPrimitive.Close
            className="absolute top-4 right-4 p-1.5 rounded-lg z-10
              text-muted-foreground hover:text-foreground
              hover:bg-accent/50 transition-all duration-200
              hover:scale-110 active:scale-95
              focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ children, icon, className }: DialogHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3 mb-6', className)}>
      {icon && (
        <div className="p-2 bg-muted/80 rounded-xl">
          {icon}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Title className={cn('font-semibold text-lg', className)}>
      {children}
    </DialogPrimitive.Title>
  );
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </DialogPrimitive.Description>
  );
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn('flex gap-3 pt-2', className)}>
      {children}
    </div>
  );
}

export function DialogClose({ children, className, asChild }: { children: React.ReactNode; className?: string; asChild?: boolean }) {
  return (
    <DialogPrimitive.Close className={className} asChild={asChild}>
      {children}
    </DialogPrimitive.Close>
  );
}
