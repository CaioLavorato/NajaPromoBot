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
        className={cn("lucide lucide-cobra", className)}
        {...props}
    >
        <path d="M10.5 12.5a3.5 3.5 0 1 1-7 0c0-5 3.5-5 3.5-5s3.5 0 3.5 5Z"/>
        <path d="M17.5 12.5a3.5 3.5 0 1 1-7 0c0-5 3.5-5 3.5-5s3.5 0 3.5 5Z"/>
        <path d="M14 7.5s-1-2-2.5-2-2.5 2-2.5 2"/>
        <path d="M7 18.5c-1.5 0-2.5-1.5-2.5-3.5 0-2.5 1-4.5 3-4.5"/>
        <path d="M17 18.5c1.5 0 2.5-1.5 2.5-3.5 0-2.5-1-4.5-3-4.5"/>
    </svg>
));
NajaIcon.displayName = "NajaIcon";
