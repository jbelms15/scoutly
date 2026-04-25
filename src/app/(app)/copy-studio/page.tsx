import { Mail, Sparkles } from 'lucide-react'

export default function CopyStudioPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">Copy Studio</h1>
      </div>

      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <h2 className="text-sm font-semibold text-fg mb-1">No copy generated yet</h2>
        <p className="text-xs text-fg-3 max-w-xs">
          Once leads are approved in the queue, their AI-generated outreach copy will appear here for review and editing.
        </p>
      </div>
    </div>
  )
}
