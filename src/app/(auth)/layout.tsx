import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-s4s-gray-light p-4">
      <Link
        href="/"
        className="mb-8 font-heading text-2xl font-bold text-s4s-blue"
      >
        S4S
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
