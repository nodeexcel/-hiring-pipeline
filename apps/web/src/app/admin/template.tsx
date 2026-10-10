/** A template remounts on every navigation, so each admin page eases in instead of snapping. */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-chai-page">{children}</div>;
}
