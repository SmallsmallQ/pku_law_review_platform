"use client";

export default function PageContainer({
  children,
  className = "",
  maxWidth = "max-w-5xl",
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div className={`min-h-screen bg-[#f9f8f5] ${className}`}>
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
