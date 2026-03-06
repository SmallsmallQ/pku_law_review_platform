"use client";

const base =
  "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#8B1538] focus:ring-offset-2 disabled:opacity-50";

export function ButtonPrimary({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={`${base} bg-[#8B1538] text-white hover:bg-[#70122e] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonOutline({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={`${base} border-2 border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538]/5 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonDanger({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={`${base} border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonGhost({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={`${base} border border-[#ddd] bg-white text-[#555] hover:bg-[#f5f5f5] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
