import type { SVGProps } from "react";

type ConverterIconProps = Omit<
  SVGProps<SVGSVGElement>,
  "children" | "fill" | "stroke" | "viewBox"
>;

export function ConverterIcon({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: ConverterIconProps) {
  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden={ariaHidden}
      focusable="false"
    >
      <path d="M19.7 8.5a8.5 8.5 0 0 0-16.3 1.4M2.1 9.8 3.45 12l1.7-1.8" />
      <path d="M4.15 15.2a8.5 8.5 0 0 0 16.5-1.3M18.65 13.75 20.6 12l1.25 2" />
    </svg>
  );
}
