"use client";

export default function PageContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-[#f5f6f8] ${className}`}>
      {children}
    </div>
  );
}

export function MainContent({
  children,
  className = "",
  maxWidth = "max-w-5xl",
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <main className={`mx-auto ${maxWidth} px-4 py-8 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </main>
  );
}
