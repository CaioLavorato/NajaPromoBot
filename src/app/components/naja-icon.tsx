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
        <path d="M211.89 156.39a28.36 28.36 0 0 1-28.27 28.27c-13.68 0-25.76-7.8-33.62-18.33-7.86 10.53-19.94 18.33-33.62 18.33s-25.76-7.8-33.62-18.33c-7.86 10.53-19.94 18.33-33.62 18.33A28.36 28.36 0 0 1 20.9 156.39c0-23.44 24.16-49.33 45.2-61.93-10.48-11.75-16-26.65-16-42.46 0-33.08 26.92-60 60-60s60 26.92 60 60c0 15.81-5.52 30.71-16 42.46 21.04 12.6 45.2 38.49 45.2 61.93zm-83.87-134.4c-26.51 0-48 21.49-48 48 0 12.91 4.19 24.78 11.39 34.34a124.3 124.3 0 0 0 36.61-34.34A47.88 47.88 0 0 1 128.02 22zM89.87 104.22a124.3 124.3 0 0 0-36.61 34.34C59.95 132.8 65.51 123 65.51 114c0-26.51-21.49-48-48-48a47.88 47.88 0 0 1 72.36 38.22z"/>
    </svg>
));
NajaIcon.displayName = "NajaIcon";