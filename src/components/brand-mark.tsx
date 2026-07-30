type BrandMarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function BrandMark({ size = 24, className, title = "RutaSaldo" }: BrandMarkProps) {
  return (
    <svg
      aria-label={title}
      className={className}
      fill="none"
      height={size}
      role="img"
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 7.5v1.8a4.2 4.2 0 0 0 4.2 4.2h3.6A4.2 4.2 0 0 1 18 17.7V19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M10.4 5h4.1" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
