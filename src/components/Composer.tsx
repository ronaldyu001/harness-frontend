import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  FileCode2,
  FileSpreadsheet,
  Image as ImageIcon,
  MessageSquareDashed,
  Paperclip,
  Square,
  X,
} from 'lucide-react'
import { Tooltip } from './Tooltip'
import { Popover } from './Popover'
import { MODELS, formatBytes, kindForFileName, nextMockFile } from '../data/mock'
import type { Attachment } from '../types'

const KIND_ICONS = {
  document: FileText,
  image: ImageIcon,
  code: FileCode2,
  data: FileSpreadsheet,
} as const

let attachmentSeq = 0

export interface ComposerProps {
  onSend: (text: string, attachments: Attachment[]) => void
  streaming: boolean
  onStop: () => void
  model: string
  onModelChange: (id: string) => void
  temporary: boolean
  onToggleTemporary: () => void
  showHints: boolean
  autoFocus?: boolean
}

export function Composer({
  onSend,
  streaming,
  onStop,
  model,
  onModelChange,
  temporary,
  onToggleTemporary,
  showHints,
  autoFocus,
}: ComposerProps) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [modelOpen, setModelOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pressed, setPressed] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const replicaRef = useRef<HTMLDivElement>(null)
  const modelBtnRef = useRef<HTMLButtonElement>(null)
  const dragDepth = useRef(0)
  const [inputHeight, setInputHeight] = useState(24)

  const canSend = text.trim().length > 0 && !streaming
  const currentModel = MODELS.find((m) => m.id === model) ?? MODELS[0]

  /* Auto-grow: measure a hidden replica so height animates without jank */
  useLayoutEffect(() => {
    const replica = replicaRef.current
    if (!replica) return
    const h = Math.min(Math.max(replica.scrollHeight, 24), 220)
    setInputHeight(h)
  }, [text])

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  /* Drag & drop — listen on the window so dropping anywhere works */
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth.current += 1
      setDragging(true)
    }
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length) {
        addFiles(files.map((f) => ({ name: f.name, size: f.size })))
      }
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  const addFiles = (files: { name: string; size: number }[]) => {
    setAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({
        id: `att-${attachmentSeq++}`,
        name: f.name,
        size: f.size,
        kind: kindForFileName(f.name),
      })),
    ])
  }

  /* Prototype: the paperclip attaches a realistic mocked file */
  const attachMock = () => {
    addFiles([nextMockFile()])
  }

  const submit = () => {
    if (!canSend) return
    onSend(text.trim(), attachments)
    setText('')
    setAttachments([])
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <motion.div
      className={`composer${dragging ? ' composer--dragging' : ''}${temporary ? ' composer--temp' : ''}`}
      animate={{ scale: pressed ? 0.992 : 1 }}
      transition={{ type: 'spring', stiffness: 800, damping: 40 }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={() => textareaRef.current?.focus()}
    >
      {/* Attachment chips */}
      <AnimatePresence initial={false}>
        {attachments.length > 0 && (
          <motion.div
            className="composer__chips"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 480, damping: 40 }}
          >
            <div className="composer__chips-row">
              <AnimatePresence initial={false}>
                {attachments.map((att) => {
                  const Icon = KIND_ICONS[att.kind]
                  return (
                    <motion.span
                      key={att.id}
                      className="attachment-chip"
                      layout
                      initial={{ opacity: 0, scale: 0.88, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                      transition={{ type: 'spring', stiffness: 540, damping: 34 }}
                    >
                      <span className={`attachment-chip__icon attachment-chip__icon--${att.kind}`}>
                        <Icon size={14} strokeWidth={1.8} />
                      </span>
                      <span className="attachment-chip__meta">
                        <span className="attachment-chip__name">{att.name}</span>
                        <span className="attachment-chip__size">{formatBytes(att.size)}</span>
                      </span>
                      <button
                        type="button"
                        className="attachment-chip__remove"
                        aria-label={`Remove ${att.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                        }}
                      >
                        <X size={12} strokeWidth={2.2} />
                      </button>
                    </motion.span>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <motion.div
        className="composer__input"
        animate={{ height: inputHeight }}
        transition={{ type: 'spring', stiffness: 620, damping: 42 }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          placeholder="Ask Maia anything"
          aria-label="Message Maia"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div ref={replicaRef} className="composer__replica" aria-hidden="true">
          {text || ' '}
          {'​'}
        </div>
      </motion.div>

      {/* Controls */}
      <div className="composer__row">
        <Tooltip label="Attach a file" side="top">
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            aria-label="Attach a file"
            onClick={(e) => {
              e.stopPropagation()
              attachMock()
            }}
          >
            <Paperclip size={16} strokeWidth={1.8} />
          </button>
        </Tooltip>

        <div className="composer__model-slot">
          <button
            type="button"
            ref={modelBtnRef}
            id="model-trigger"
            className={`model-chip${modelOpen ? ' model-chip--open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={modelOpen}
            onClick={(e) => {
              e.stopPropagation()
              setModelOpen((v) => !v)
            }}
          >
            <span>{currentModel.name}</span>
            <motion.span
              className="model-chip__chev"
              animate={{ rotate: modelOpen ? 180 : 0 }}
              transition={{ duration: 0.18 }}
            >
              <ChevronDown size={13} strokeWidth={2} />
            </motion.span>
          </button>
          <Popover
            open={modelOpen}
            onClose={() => setModelOpen(false)}
            anchorRef={modelBtnRef}
            placement="top-start"
            width={264}
            labelledBy="model-trigger"
          >
            <div className="model-menu">
              <div className="model-menu__title">Model</div>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`menu-item model-menu__item${m.id === model ? ' model-menu__item--on' : ''}`}
                  data-menu-item
                  role="menuitemradio"
                  aria-checked={m.id === model}
                  onClick={() => {
                    onModelChange(m.id)
                    setModelOpen(false)
                  }}
                >
                  <span className="model-menu__meta">
                    <span className="model-menu__name">
                      {m.name}
                      {m.badge && <span className="model-menu__badge">{m.badge}</span>}
                    </span>
                    <span className="model-menu__caption">{m.caption}</span>
                  </span>
                  {m.id === model && <Check size={15} strokeWidth={2.2} className="model-menu__check" />}
                </button>
              ))}
            </div>
          </Popover>
        </div>

        <Tooltip label={temporary ? 'Temporary chat on — not saved' : 'Temporary chat'} side="top">
          <button
            type="button"
            className={`icon-btn icon-btn--sm${temporary ? ' icon-btn--accent' : ''}`}
            aria-label="Toggle temporary chat"
            aria-pressed={temporary}
            onClick={(e) => {
              e.stopPropagation()
              onToggleTemporary()
            }}
          >
            <MessageSquareDashed size={16} strokeWidth={1.8} />
          </button>
        </Tooltip>

        <div className="composer__spacer" />

        <AnimatePresence>
          {showHints && canSend && (
            <motion.span
              className="composer__hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <kbd>⏎</kbd> to send
            </motion.span>
          )}
        </AnimatePresence>

        {streaming ? (
          <Tooltip label="Stop generating" side="top">
            <motion.button
              type="button"
              className="send-btn send-btn--stop"
              aria-label="Stop generating"
              onClick={(e) => {
                e.stopPropagation()
                onStop()
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.92 }}
            >
              <Square size={11} strokeWidth={0} fill="currentColor" />
            </motion.button>
          </Tooltip>
        ) : (
          <motion.button
            type="button"
            className="send-btn"
            aria-label="Send message"
            disabled={!canSend}
            onClick={(e) => {
              e.stopPropagation()
              submit()
            }}
            whileTap={canSend ? { scale: 0.9 } : undefined}
            animate={{ scale: 1 }}
          >
            <ArrowUp size={16} strokeWidth={2.4} />
          </motion.button>
        )}
      </div>

      {/* Drop state */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            className="composer__drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <Paperclip size={16} strokeWidth={1.8} />
            <span>Drop files for Maia</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
