import { LogoMark } from "@/components/brand/logo-mark";

export function BrandMark({ className }: { className?: string }) {
  return <LogoMark className={`h-10 w-10 shrink-0 ${className ?? ""}`} id="landing-brand" />;
}
