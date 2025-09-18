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
        className={cn("lucide lucide-cobra-aggressive", className)}
        {...props}
    >
        <path d="M14.2 8.3c-1-2.9-3.4-5-6.2-5.3-2.8-.3-5.5 1.2-6.5 3.9-.3.8-.4 1.7-.2 2.6.4 1.7 1.6 3.1 3.2 3.8"/>
        <path d="M9.8 15.7c1 2.9 3.4 5 6.2 5.3 2.8.3 5.5-1.2 6.5-3.9.3-.8.4-1.7.2-2.6-.4-1.7-1.6-3.1-3.2-3.8"/>
        <path d="M15.5 13.5c1-1 2-2.5 2-4.5"/>
        <path d="M8.5 10.5c-1 1-2 2.5-2 4.5"/>
        <path d="m12 12 1-1"/>
        <path d="m11 13-1-1"/>
    </svg>
));
NajaIcon.displayName = "NajaIcon";
