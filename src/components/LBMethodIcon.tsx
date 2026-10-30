import type { SVGProps } from 'react';

/** LB monogram: inherits navigation color in both themes and active states. */
export default function LBMethodIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" data-lb-method-icon="true">
      <path d="M3 5v14h7M14 5v14h3.5a3.5 3.5 0 0 0 0-7H14m0-7h3a3.5 3.5 0 0 1 0 7" />
    </svg>
  );
}
