import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuContent = ({ className = '', sideOffset = 10, ...props }) => <DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content sideOffset={sideOffset} className={`dropdown-content ${className}`} {...props}/></DropdownMenuPrimitive.Portal>;
export const DropdownMenuItem = ({ className = '', ...props }) => <DropdownMenuPrimitive.Item className={`dropdown-item ${className}`} {...props}/>;
export const DropdownMenuLabel = ({ className = '', ...props }) => <DropdownMenuPrimitive.Label className={`dropdown-label ${className}`} {...props}/>;
export const DropdownMenuSeparator = () => <DropdownMenuPrimitive.Separator className="dropdown-separator"/>;
