import type { ReactNode } from "react";

interface ProblemBoardProps {
  children: ReactNode;
  title: string;
}

export function ProblemBoard({ children, title }: ProblemBoardProps) {
  return (
    <section className="problem-board" aria-label="Problem and requirements">
      <header className="problem-board__header">
        <div className="problem-board__title" aria-hidden="true">
          {title}
        </div>
      </header>
      {children}
    </section>
  );
}
