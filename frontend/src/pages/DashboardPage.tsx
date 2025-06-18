import { Dashboard } from "@/components/Dashboard"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export function DashboardPage() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-background">
        <Dashboard />
        <Toaster />
      </div>
    </ThemeProvider>
  )
} 