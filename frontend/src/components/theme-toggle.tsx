import { Moon, Sun } from 'lucide-react'
import { useAppStore } from '../stores/app-store'

export function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useAppStore()

  return (
    <button
      onClick={toggleDarkMode}
      className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors"
      title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}
    >
      {darkMode ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
