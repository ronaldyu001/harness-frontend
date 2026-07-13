import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { PanelLeft } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { Composer } from './components/Composer'
import { Thread } from './components/Thread'
import { SearchOverlay } from './components/SearchOverlay'
import { Toast } from './components/Toast'
import { MaiaMark } from './components/MaiaMark'
import type { Prefs } from './components/SettingsPanel'
import {
  ARCH_RESPONSE,
  ARCH_RESPONSE_ALT,
  FOLLOW_UPS,
  SEED_CONVERSATIONS,
  SUGGESTIONS,
  greetingForHour,
} from './data/mock'
import type { AssistantMessage, Attachment, Conversation, Message } from './types'

let seq = 0
const uid = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`

const springSoft = { type: 'spring', stiffness: 300, damping: 32 } as const

interface StreamToken {
  cancelled: boolean
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(SEED_CONVERSATIONS)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [convoLoading, setConvoLoading] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [tempMode, setTempMode] = useState(false)
  const [model, setModel] = useState('maia-2.5')
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [prefs, setPrefs] = useState<Prefs>({ reduceMotion: false, showHints: true, textSize: 'md' })

  const streamRef = useRef<{ token: StreamToken; convoId: string; msgId: string } | null>(null)
  const chunksRef = useRef<Record<string, string[]>>({})
  const genCount = useRef(0)
  const followUpIdx = useRef(0)
  const loadTimer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)

  const active = conversations.find((c) => c.id === activeId) ?? null
  const isHome = active === null
  const isStreaming = useMemo(
    () =>
      active?.messages.some(
        (m) => m.role === 'assistant' && (m.status === 'thinking' || m.status === 'streaming'),
      ) ?? false,
    [active],
  )

  const showToast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text })
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  /* ── Conversation state helpers ── */

  const updateMessage = useCallback(
    (convoId: string, msgId: string, patch: (m: AssistantMessage) => AssistantMessage) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convoId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === msgId && m.role === 'assistant' ? patch(m) : m,
                ),
              },
        ),
      )
    },
    [],
  )

  /* ── Streaming engine: semantic chunks, never per-character ── */

  const cancelCurrentStream = useCallback(
    (markStopped: boolean) => {
      const current = streamRef.current
      if (!current) return
      current.token.cancelled = true
      if (markStopped) {
        updateMessage(current.convoId, current.msgId, (m) =>
          m.status === 'thinking' || m.status === 'streaming' ? { ...m, status: 'stopped' } : m,
        )
      }
      streamRef.current = null
    },
    [updateMessage],
  )

  const beginStream = useCallback(
    (convoId: string, msgId: string, chunks: string[], opts?: { forceSuccess?: boolean }) => {
      cancelCurrentStream(true)
      const token: StreamToken = { cancelled: false }
      streamRef.current = { token, convoId, msgId }
      chunksRef.current[msgId] = chunks

      genCount.current += 1
      const shouldFail = !opts?.forceSuccess && genCount.current % 4 === 0
      const failAt = shouldFail ? Math.min(3, chunks.length - 1) : -1

      let i = 0
      const step = () => {
        if (token.cancelled) return
        if (i === failAt) {
          updateMessage(convoId, msgId, (m) => ({ ...m, status: 'error' }))
          streamRef.current = null
          return
        }
        if (i >= chunks.length) {
          updateMessage(convoId, msgId, (m) => ({ ...m, status: 'complete' }))
          streamRef.current = null
          return
        }
        const chunk = chunks[i]
        updateMessage(convoId, msgId, (m) => ({ ...m, md: m.md + chunk, status: 'streaming' }))
        i += 1
        window.setTimeout(step, Math.min(140 + chunk.length * 1.05, 460))
      }
      window.setTimeout(step, 900)
    },
    [cancelCurrentStream, updateMessage],
  )

  const pickChunks = useCallback((text: string): string[] => {
    const t = text.toLowerCase()
    if (t.includes('architect') || t.includes('assistant')) return ARCH_RESPONSE
    const chunks = FOLLOW_UPS[followUpIdx.current % FOLLOW_UPS.length]
    followUpIdx.current += 1
    return chunks
  }, [])

  /* ── Actions ── */

  const handleSend = useCallback(
    (text: string, attachments: Attachment[]) => {
      const userMsg: Message = { id: uid('u'), role: 'user', text, attachments }
      const assistantMsg: AssistantMessage = {
        id: uid('a'),
        role: 'assistant',
        md: '',
        status: 'thinking',
        model,
      }

      let convoId = activeId
      if (!convoId) {
        convoId = uid('c')
        const title = text.length > 44 ? `${text.slice(0, 44).replace(/\s+\S*$/, '')}…` : text
        const convo: Conversation = {
          id: convoId,
          title,
          group: 'today',
          temporary: tempMode,
          messages: [userMsg, assistantMsg],
        }
        setConversations((prev) => [convo, ...prev])
        setActiveId(convoId)
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId ? { ...c, messages: [...c.messages, userMsg, assistantMsg] } : c,
          ),
        )
      }
      beginStream(convoId, assistantMsg.id, pickChunks(text))
    },
    [activeId, beginStream, model, pickChunks, tempMode],
  )

  const handleStop = useCallback(() => cancelCurrentStream(true), [cancelCurrentStream])

  const handleRegenerate = useCallback(
    (assistantId: string) => {
      if (!active) return
      const prevChunks = chunksRef.current[assistantId]
      const alt =
        prevChunks === ARCH_RESPONSE
          ? ARCH_RESPONSE_ALT
          : prevChunks === ARCH_RESPONSE_ALT
            ? ARCH_RESPONSE
            : FOLLOW_UPS[followUpIdx.current++ % FOLLOW_UPS.length]
      updateMessage(active.id, assistantId, (m) => ({ ...m, md: '', status: 'thinking' }))
      beginStream(active.id, assistantId, alt, { forceSuccess: true })
    },
    [active, beginStream, updateMessage],
  )

  const handleRetry = useCallback(
    (assistantId: string) => {
      if (!active) return
      const chunks = chunksRef.current[assistantId] ?? FOLLOW_UPS[0]
      updateMessage(active.id, assistantId, (m) => ({ ...m, md: '', status: 'thinking' }))
      beginStream(active.id, assistantId, chunks, { forceSuccess: true })
    },
    [active, beginStream, updateMessage],
  )

  const handleEditUser = useCallback(
    (userId: string, newText: string) => {
      if (!active) return
      const idx = active.messages.findIndex((m) => m.id === userId)
      if (idx === -1) return
      cancelCurrentStream(false)
      const assistantMsg: AssistantMessage = {
        id: uid('a'),
        role: 'assistant',
        md: '',
        status: 'thinking',
        model,
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== active.id
            ? c
            : {
                ...c,
                messages: [
                  ...c.messages.slice(0, idx),
                  { ...c.messages[idx], text: newText } as Message,
                  assistantMsg,
                ],
              },
        ),
      )
      beginStream(active.id, assistantMsg.id, pickChunks(newText))
    },
    [active, beginStream, cancelCurrentStream, model, pickChunks],
  )

  const openConversation = useCallback(
    (id: string) => {
      if (id === activeId) return
      window.clearTimeout(loadTimer.current)
      setActiveId(id)
      setTempMode(false)
      setConvoLoading(true)
      loadTimer.current = window.setTimeout(() => setConvoLoading(false), 460)
    },
    [activeId],
  )

  const newChat = useCallback(() => {
    cancelCurrentStream(true)
    setActiveId(null)
    setTempMode(false)
  }, [cancelCurrentStream])

  const temporaryChat = useCallback(() => {
    cancelCurrentStream(true)
    setActiveId(null)
    setTempMode(true)
  }, [cancelCurrentStream])

  const toggleTemporary = useCallback(() => {
    if (isHome) {
      setTempMode((v) => !v)
    } else if (active?.temporary) {
      newChat()
    } else {
      temporaryChat()
      showToast('Started a temporary chat')
    }
  }, [isHome, active, newChat, temporaryChat, showToast])

  /* ── Global keys ── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setSidebarExpanded((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const greeting = greetingForHour(new Date().getHours())
  const historyConversations = conversations.filter((c) => !c.temporary)
  const temporaryActive = tempMode || (active?.temporary ?? false)

  return (
    <MotionConfig reducedMotion={prefs.reduceMotion ? 'always' : 'user'}>
      <div
        className="app"
        data-reduce-motion={prefs.reduceMotion || undefined}
        data-text-size={prefs.textSize}
      >
        <div className="app__ambient" aria-hidden="true" />

        <Sidebar
          expanded={sidebarExpanded}
          onToggle={setSidebarExpanded}
          conversations={historyConversations}
          activeId={activeId}
          onSelect={openConversation}
          onNewChat={newChat}
          onTemporaryChat={temporaryChat}
          onOpenSearch={() => setSearchOpen(true)}
          temporaryActive={temporaryActive}
          prefs={prefs}
          onPrefsChange={setPrefs}
          onToast={showToast}
        />

        {/* Mobile drawer */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                key="scrim"
                className="drawer-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setDrawerOpen(false)}
              />
              <motion.div
                key="drawer"
                className="drawer"
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -308 }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              >
                <Sidebar
                  expanded
                  onToggle={() => setDrawerOpen(false)}
                  conversations={historyConversations}
                  activeId={activeId}
                  onSelect={openConversation}
                  onNewChat={newChat}
                  onTemporaryChat={temporaryChat}
                  onOpenSearch={() => setSearchOpen(true)}
                  temporaryActive={temporaryActive}
                  prefs={prefs}
                  onPrefsChange={setPrefs}
                  onToast={showToast}
                  isDrawer
                  onCloseDrawer={() => setDrawerOpen(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="workspace">
          {/* Slim header, present in conversation state */}
          <AnimatePresence>
            {!isHome && (
              <motion.header
                key="header"
                className="workspace__header"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  className="icon-btn icon-btn--sm workspace__menu"
                  aria-label="Open navigation"
                  onClick={() => setDrawerOpen(true)}
                >
                  <PanelLeft size={17} strokeWidth={1.8} />
                </button>
                <h1 className="workspace__title">{active?.title}</h1>
                {active?.temporary && <span className="temp-badge">Temporary</span>}
              </motion.header>
            )}
          </AnimatePresence>

          {/* Mobile menu affordance on home */}
          {isHome && (
            <button
              type="button"
              className="icon-btn icon-btn--sm workspace__menu workspace__menu--float"
              aria-label="Open navigation"
              onClick={() => setDrawerOpen(true)}
            >
              <PanelLeft size={17} strokeWidth={1.8} />
            </button>
          )}

          <div className={`canvas${isHome ? ' canvas--home' : ' canvas--chat'}`}>
            <AnimatePresence mode="popLayout">
              {isHome ? (
                <motion.div
                  key="intro"
                  className="home-intro"
                  initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -18, filter: 'blur(6px)', transition: { duration: 0.2 } }}
                  transition={{ ...springSoft, delay: 0.04 }}
                >
                  <MaiaMark size={40} className="home-intro__mark" />
                  <h1 className="home-intro__greeting">{greeting}</h1>
                  <AnimatePresence>
                    {tempMode && (
                      <motion.span
                        className="temp-pill"
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
                        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                      >
                        Temporary chat — it won’t be saved
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="thread"
                  className="thread-wrap"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.16 } }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                >
                  <Thread
                    messages={active?.messages ?? []}
                    loading={convoLoading}
                    onRegenerate={handleRegenerate}
                    onRetry={handleRetry}
                    onEditUser={handleEditUser}
                    onToast={showToast}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              layout="position"
              className="composer-slot"
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <Composer
                onSend={handleSend}
                streaming={isStreaming}
                onStop={handleStop}
                model={model}
                onModelChange={(id) => setModel(id)}
                temporary={temporaryActive}
                onToggleTemporary={toggleTemporary}
                showHints={prefs.showHints}
                autoFocus
              />
            </motion.div>

            <AnimatePresence mode="popLayout">
              {isHome && (
                <motion.div
                  key="suggestions"
                  className="home-below"
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: 14, transition: { duration: 0.16 } }}
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.045, delayChildren: 0.16 } },
                  }}
                >
                  <div className="home-suggestions">
                    {SUGGESTIONS.map((s) => (
                      <motion.button
                        key={s}
                        type="button"
                        className="suggestion"
                        onClick={() => handleSend(s, [])}
                        variants={{
                          hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
                          show: {
                            opacity: 1,
                            y: 0,
                            filter: 'blur(0px)',
                            transition: { type: 'spring', stiffness: 420, damping: 34 },
                          },
                        }}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                  <motion.p
                    className="home-filehint"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
                    }}
                  >
                    Maia reads files too — drop them anywhere
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <SearchOverlay
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          conversations={historyConversations}
          onSelect={openConversation}
          showHints={prefs.showHints}
        />

        <Toast toast={toast} />
      </div>
    </MotionConfig>
  )
}
