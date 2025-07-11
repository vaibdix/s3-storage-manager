import React from 'react';
import { cn } from '../../utils/cn';

const VisuallyHidden = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
      className
    )}
    {...props}
  />
));

VisuallyHidden.displayName = "VisuallyHidden";

export { VisuallyHidden };