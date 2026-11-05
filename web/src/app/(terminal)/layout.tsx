import { Shell } from '@/components/terminal/Shell'

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>
}
