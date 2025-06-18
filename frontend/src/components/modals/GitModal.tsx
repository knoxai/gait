import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslation } from "react-i18next"
import type { ModalType } from "@/lib/types"

interface GitModalProps {
  isOpen: boolean
  onClose: () => void
  type: ModalType
  title: string
  data?: any
  onConfirm: (data: any) => void
}

export function GitModal({ isOpen, onClose, type, title, data, onConfirm }: GitModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await onConfirm(formData)
      onClose()
      setFormData({})
    } catch (error) {
      console.error('Modal action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setFormData({})
  }

  // Confirmation dialogs
  if (type === 'confirm') {
    return (
      <AlertDialog open={isOpen} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>
              {data?.message || t('actions.confirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onConfirm(data)} disabled={isLoading}>
              {isLoading ? t('status.loading') : t('actions.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // Error dialogs
  if (type === 'error') {
    return (
      <AlertDialog open={isOpen} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>
              {data?.message || t('status.error')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClose}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // Form dialogs
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {getDialogDescription(type)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {type === 'commit' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="message">{t('commit.message')}</Label>
                <Textarea
                  id="message"
                  placeholder={t('dialog.commit_message_placeholder')}
                  value={formData.message || ''}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {t('dialog.commit_message_tip')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="amend"
                  checked={formData.amend || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, amend: checked })}
                />
                <Label htmlFor="amend" className="text-sm">
                  {t('dialog.amend_commit')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="signoff"
                  checked={formData.signoff || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, signoff: checked })}
                />
                <Label htmlFor="signoff" className="text-sm">
                  {t('dialog.signoff_commit')}
                </Label>
              </div>
            </>
          )}

          {type === 'branch' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="branchName">{t('dialog.branch_name')}</Label>
                <Input
                  id="branchName"
                  placeholder="feature/new-feature"
                  value={formData.branchName || ''}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('dialog.branch_name_tip')}
                </p>
              </div>
              {data?.startPoint && (
                <div className="grid gap-2">
                  <Label htmlFor="startPoint">Start Point</Label>
                  <Input
                    id="startPoint"
                    value={data.startPoint}
                    disabled
                  />
                </div>
              )}
            </>
          )}

          {type === 'tag' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="tagName">Tag Name</Label>
                <Input
                  id="tagName"
                  placeholder="v1.0.0"
                  value={formData.tagName || ''}
                  onChange={(e) => setFormData({ ...formData, tagName: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="annotated"
                  checked={formData.annotated || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, annotated: checked })}
                />
                <Label htmlFor="annotated" className="text-sm">
                  {t('dialog.tag_annotated')}
                </Label>
              </div>
              {formData.annotated && (
                <div className="grid gap-2">
                  <Label htmlFor="tagMessage">{t('dialog.tag_message')}</Label>
                  <Textarea
                    id="tagMessage"
                    placeholder="Release notes..."
                    value={formData.message || ''}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                  />
                </div>
              )}
              {data?.commitHash && (
                <div className="grid gap-2">
                  <Label htmlFor="commitHash">Commit</Label>
                  <Input
                    id="commitHash"
                    value={data.commitHash}
                    disabled
                  />
                </div>
              )}
            </>
          )}

          {type === 'stash' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="stashMessage">Stash Message (optional)</Label>
                <Input
                  id="stashMessage"
                  placeholder="Work in progress..."
                  value={formData.message || ''}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeUntracked"
                  checked={formData.includeUntracked || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeUntracked: checked })}
                />
                <Label htmlFor="includeUntracked" className="text-sm">
                  {t('dialog.stash_include_untracked')}
                </Label>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('actions.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !isFormValid(type, formData)}
          >
            {isLoading ? t('status.loading') : getConfirmText(type)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getDialogDescription(type: ModalType): string {
  const { t } = useTranslation()
  
  switch (type) {
    case 'commit':
      return t('dialog.commit_title')
    case 'branch':
      return t('dialog.create_branch_title')
    case 'tag':
      return 'Create a new tag'
    case 'stash':
      return 'Create a new stash'
    default:
      return ''
  }
}

function getConfirmText(type: ModalType): string {
  const { t } = useTranslation()
  
  switch (type) {
    case 'commit':
      return t('actions.commit_changes')
    case 'branch':
      return t('branch.create_new')
    case 'tag':
      return t('git.create_tag')
    case 'stash':
      return t('git.create_stash')
    default:
      return t('actions.confirm')
  }
}

function isFormValid(type: ModalType, formData: any): boolean {
  switch (type) {
    case 'commit':
      return formData.message && formData.message.trim().length > 0
    case 'branch':
      return formData.branchName && formData.branchName.trim().length > 0
    case 'tag':
      return formData.tagName && formData.tagName.trim().length > 0
    case 'stash':
      return true // Stash message is optional
    default:
      return true
  }
} 