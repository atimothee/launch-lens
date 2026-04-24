import Link from "next/link";
import { Logo } from "./Logo";

export function Nav({
  right,
}: {
  right?: React.ReactNode;
}) {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-10">
      <Link href="/" className="flex items-center">
        <Logo />
      </Link>
      <div className="flex items-center gap-3">{right}</div>
    </header>
  );
}
