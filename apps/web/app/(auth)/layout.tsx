export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-6">
      <div className="absolute inset-0 gradient-mesh -z-10" />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
