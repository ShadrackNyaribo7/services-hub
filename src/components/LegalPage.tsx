import type { ReactNode } from "react";

type LegalPageProps = {
  children: ReactNode;
  title: string;
};

export default function LegalPage({ children, title }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-gray-900 px-6 py-12 text-slate-50">
      <article className="relative z-10 mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">{title}</h1>
        <div className="space-y-6 text-slate-300">{children}</div>
        <p className="mt-8 text-sm text-slate-400">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </article>
    </main>
  );
}
