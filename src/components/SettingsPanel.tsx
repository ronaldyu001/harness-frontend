import { Switch } from './Switch'

export interface Prefs {
  reduceMotion: boolean
  showHints: boolean
  textSize: 'sm' | 'md' | 'lg'
}

const SIZES: { id: Prefs['textSize']; label: string }[] = [
  { id: 'sm', label: 'Snug' },
  { id: 'md', label: 'Default' },
  { id: 'lg', label: 'Roomy' },
]

export function SettingsPanel({ prefs, onChange }: { prefs: Prefs; onChange: (p: Prefs) => void }) {
  return (
    <div className="settings">
      <div className="settings__title">Preferences</div>

      <div className="settings__row">
        <div className="settings__label">
          <span>Appearance</span>
          <span className="settings__hint">Light theme is on the way</span>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Appearance">
          <button type="button" className="segmented__opt segmented__opt--on" role="radio" aria-checked="true" data-menu-item>
            Dark
          </button>
          <button type="button" className="segmented__opt" role="radio" aria-checked="false" disabled title="Coming soon">
            Light
          </button>
        </div>
      </div>

      <div className="settings__row">
        <div className="settings__label">
          <span>Text size</span>
          <span className="settings__hint">Applies to conversations</span>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Text size">
          {SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={prefs.textSize === s.id}
              className={`segmented__opt${prefs.textSize === s.id ? ' segmented__opt--on' : ''}`}
              onClick={() => onChange({ ...prefs, textSize: s.id })}
              data-menu-item
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings__row settings__row--inline">
        <div className="settings__label">
          <span>Reduce motion</span>
          <span className="settings__hint">Calms transitions and effects</span>
        </div>
        <Switch
          checked={prefs.reduceMotion}
          onChange={(v) => onChange({ ...prefs, reduceMotion: v })}
          label="Reduce motion"
        />
      </div>

      <div className="settings__row settings__row--inline">
        <div className="settings__label">
          <span>Keyboard hints</span>
          <span className="settings__hint">Show shortcuts in the interface</span>
        </div>
        <Switch
          checked={prefs.showHints}
          onChange={(v) => onChange({ ...prefs, showHints: v })}
          label="Keyboard hints"
        />
      </div>

      <div className="settings__foot">Maia Preview 0.1 — prototype data only</div>
    </div>
  )
}
