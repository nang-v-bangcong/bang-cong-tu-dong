import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DayNoteCell } from './day-note-cell'

describe('DayNoteCell', () => {
  it('shows empty icon when no note', () => {
    render(<DayNoteCell day={5} note="" onSave={() => {}} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows note text when present', () => {
    render(<DayNoteCell day={5} note="Nghỉ lễ" onSave={() => {}} />)
    expect(screen.getByText('Nghỉ lễ')).toBeInTheDocument()
  })

  it('opens textarea on click and saves on blur', () => {
    const onSave = vi.fn()
    render(<DayNoteCell day={5} note="" onSave={onSave} />)
    fireEvent.click(screen.getByRole('button'))
    const ta = screen.getByPlaceholderText('Ghi chú...') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'Mưa' } })
    fireEvent.blur(ta)
    expect(onSave).toHaveBeenCalledWith(5, 'Mưa')
  })

  it('does not save if unchanged', () => {
    const onSave = vi.fn()
    render(<DayNoteCell day={5} note="Tết" onSave={onSave} />)
    fireEvent.click(screen.getByRole('button'))
    const ta = screen.getByPlaceholderText('Ghi chú...')
    fireEvent.blur(ta)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('Escape cancels without saving', () => {
    const onSave = vi.fn()
    render(<DayNoteCell day={5} note="Old" onSave={onSave} />)
    fireEvent.click(screen.getByRole('button'))
    const ta = screen.getByPlaceholderText('Ghi chú...') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'changed' } })
    fireEvent.keyDown(ta, { key: 'Escape' })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('Ctrl+Enter commits save', () => {
    const onSave = vi.fn()
    render(<DayNoteCell day={5} note="" onSave={onSave} />)
    fireEvent.click(screen.getByRole('button'))
    const ta = screen.getByPlaceholderText('Ghi chú...')
    fireEvent.change(ta, { target: { value: 'ok' } })
    fireEvent.keyDown(ta, { key: 'Enter', ctrlKey: true })
    expect(onSave).toHaveBeenCalledWith(5, 'ok')
  })

  it('enforces 500 char limit via maxLength', () => {
    render(<DayNoteCell day={1} note="" onSave={() => {}} />)
    fireEvent.click(screen.getByRole('button'))
    const ta = screen.getByPlaceholderText('Ghi chú...') as HTMLTextAreaElement
    expect(ta.maxLength).toBe(500)
  })
})
