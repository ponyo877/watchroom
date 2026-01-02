import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          `w-full px-4 py-2.5
           bg-background/50 backdrop-blur-sm
           border rounded-xl
           text-sm text-foreground
           placeholder:text-muted-foreground
           transition-all duration-200
           hover:border-primary/30
           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
           disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input`,
          error && 'border-destructive focus:ring-destructive/50 focus:border-destructive',
          !error && 'border-input',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
