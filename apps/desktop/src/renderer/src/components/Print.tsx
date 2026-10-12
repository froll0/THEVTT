import type { ReactNode } from 'react';

/** A tab of a sheet: on paper it gets its title and starts where it fits. */
export function PrintPart({ label, print, children }: { label: string; print?: boolean; children: ReactNode }) {
  if (!print) return <>{children}</>;
  return (
    <section className="print-part">
      <h2>{label}</h2>
      {children}
    </section>
  );
}
