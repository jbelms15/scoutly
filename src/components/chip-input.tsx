'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export default function ChipInput({ value, onChange, placeholder = 'Type and press Enter...', className }: Props) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const chips = value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  function addChip(text: string) {
    const trimmed = text.trim()
    if (!trimmed || chips.includes(trimmed)) return
    onChange([...chips, trimmed].join(', '))
  }

  function removeChip(chip: string) {
    onChange(chips.filter(c => c !== chip).join(', '))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addChip(input)
      setInput('')
    }
    if (e.key === 'Backspace' && !input && chips.length > 0) {
      removeChip(chips[chips.length - 1])
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex flex-wrap gap-1.5 min-h-[36px] bg-card border border-border rounded px-2 py-1.5 cursor-text focus-within:border-accent transition-colors',
        className
      )}
    >
      {chips.map(chip => (
        <span
          key={chip}
          className="flex items-center gap-1 px-2 py-0.5 bg-accent-muted text-accent text-xs rounded-full border border-accent/20"
        >
          {chip}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); removeChip(chip) }}
            className="text-accent/60 hover:text-accent transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value.replace(/,$/, ''))}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) { addChip(input); setInput('') } }}
        placeholder={chips.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-xs text-fg placeholder:text-fg-3 outline-none"
      />
    </div>
  )
}
