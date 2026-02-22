import { Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  label: string
}

export function EmptyPane({ label }: Props): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-700">
      <Layers className="h-10 w-10" />
      <div className="text-center">
        <p className="text-sm font-medium text-slate-600">{t('pane.empty', { label })}</p>
        <p className="mt-1 text-xs text-slate-700">{t('pane.emptyHint')}</p>
      </div>
    </div>
  )
}
