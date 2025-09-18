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
        <path d="M128 24a96 96 0 0 0-96 96c0 30.34 14.21 57.45 36.83 75.34C44.77 207.22 24 224 24 224a8 8 0 0 0 4.19 14.58C64.83 227.8 88 208 88 208c12.23 6.3 26.13 9.87 40 9.87s27.77-3.57 40-9.87s23.17 19.8 59.81 30.58A8 8 0 0 0 232 224s-20.77-16.78-44.83-32.66C209.79 177.45 224 150.34 224 120a96 96 0 0 0-96-96zm0 16a80 80 0 0 1 80 80c0 23.49-10.22 44.8-26.63 59.34a8 8 0 0 0-3.57 9.89s19.83 23.07 43.62 34.62c-31.5-10.1-47.37-29-47.37-29a8 8 0 0 0-12.1 0s-15.87 18.9-47.37 29c23.79-11.55 43.62-34.62 43.62-34.62a8 8 0 0 0-3.57-9.89C42.22 164.8 32 143.49 32 120a80 80 0 0 1 80-80c5.3 0 10.46.52 15.42 1.52a8 8 0 0 0 5.16-14.63A95.44 95.44 0 0 0 128 40z"/>
    </svg>
));
NajaIcon.displayName = "NajaIcon";
