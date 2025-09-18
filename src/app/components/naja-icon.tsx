import * as React from "react";
import { cn } from "@/lib/utils";

export const NajaIcon = React.forwardRef<
    SVGSVGElement,
    React.SVGProps<SVGSVGElement>
>(({ className, ...props }, ref) => (
    <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("lucide lucide-snake", className)}
        {...props}
    >
        <path d="M11 12.5a3.5 3.5 0 1 1-7 0c0-5 3.5-5 3.5-5s3.5 0 3.5 5Z" />
        <path d="M18 12.5a3.5 3.5 0 1 1-7 0c0-5 3.5-5 3.5-5s3.5 0 3.5 5Z" />
        <path d="M14.5 7.5s-1-2-3-2-3 2-3 2" />
        <path d="M7 18.5c-1.2 0-2-1.8-2-4 0-2.2 1-4 2.5-4" />
        <path d="M17 18.5c1.2 0 2-1.8 2-4 0-2.2-1-4-2.5-4" />
    </svg>
));
NajaIcon.displayName = "NajaIcon";
