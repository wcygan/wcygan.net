import type { SVGProps } from "react";

type ShipmentIconProps = Omit<
  SVGProps<SVGSVGElement>,
  "children" | "fill" | "stroke" | "viewBox"
>;

export function ShipmentIcon({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: ShipmentIconProps) {
  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden={ariaHidden}
      focusable="false"
    >
      <path d="m4.5 7.35 7.5-3.7 7.5 3.7L12 11.1z" />
      <path d="M4.5 7.35v9.3l7.5 3.7 7.5-3.7v-9.3M12 11.1v9.25" />
    </svg>
  );
}
