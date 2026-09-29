import * as PopoverPrimitive from '@radix-ui/react-popover';
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverContent = ({ className = '', sideOffset = 10, ...props }) => <PopoverPrimitive.Portal><PopoverPrimitive.Content sideOffset={sideOffset} className={`popover-content ${className}`} {...props}/></PopoverPrimitive.Portal>;
