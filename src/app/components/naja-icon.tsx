import * as React from "react";
import { cn } from "@/lib/utils";

export const NajaIcon = React.forwardRef<
    SVGSVGElement,
    React.SVGProps<SVGSVGElement>
>(({ className, ...props }, ref) => (
    <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        fill="currentColor"
        className={cn("naja-icon", className)}
        {...props}
    >
        <path d="M208,80H192c0-44.11-35.89-80-80-80S32,35.89,32,80H16a8,8,0,0,0-8,8V184a8,8,0,0,0,8,8H40.24a40,40,0,0,0,75.52,0H200a8,8,0,0,0,8-8V88A8,8,0,0,0,208,80ZM112,16a64.07,64.07,0,0,1,64,64H48A64.07,64.07,0,0,1,112,16Zm0,192a24,24,0,1,1,24-24A24,24,0,0,1,112,208Zm88-24H145.45a40.23,40.23,0,0,0-66.9,0H24V96H192Z"/>
        <path d="M80,120a8,8,0,0,1-8,8,8,8,0,0,1,0-16,8,8,0,0,1,8,8Z"/>
        <path d="M144,120a8,8,0,1,1-8-8A8,8,0,0,1,144,120Z"/>
    </svg>
));
NajaIcon.displayName = "NajaIcon";
