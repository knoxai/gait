import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from "react-i18next"
import { api } from "@/lib/api"
import { useNotifications } from "@/hooks/useNotifications"

export function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const { addNotification } = useNotifications()

  const changeLanguage = async (lng: string) => {
    try {
      // Update backend language setting
      await api.switchLanguage(lng)
      
      // Update frontend language
      i18n.changeLanguage(lng)
      
      addNotification({
        type: 'success',
        title: t('notifications.language_changed'),
        message: `Language switched to ${lng === 'zh' ? 'Chinese' : 'English'}`
      })
    } catch (error) {
      console.error('Failed to switch language:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to switch language'
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Globe className="h-3 w-3 mr-1.5" />
          {i18n.language === 'zh' ? t('chinese') : t('english')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')}>
          <span>🇺🇸</span>
          <span className="ml-2">{t('english')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('zh')}>
          <span>🇨🇳</span>
          <span className="ml-2">{t('chinese')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 