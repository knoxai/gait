import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { useTranslation } from "react-i18next"

export function ThemeToggle() {
  const { toggleTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-7 px-2 text-xs" 
      onClick={toggleTheme}
    >
      <Sun className="h-3 w-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-3 w-3 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t('theme.toggle')}</span>
    </Button>
  )
} 