import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpDialog } from './help-dialog'

describe('HelpDialog', () => {
  it('renders personal content for tab=personal', () => {
    render(<HelpDialog tab="personal" onClose={() => {}} />)
    expect(screen.getByText('Hướng dẫn — Tab Cá nhân')).toBeInTheDocument()
    expect(screen.getAllByText(/Chấm công/i).length).toBeGreaterThan(0)
  })

  it('renders team content', () => {
    render(<HelpDialog tab="team" onClose={() => {}} />)
    expect(screen.getByText('Hướng dẫn — Tab Nhóm')).toBeInTheDocument()
    expect(screen.getAllByText(/Thêm người/i).length).toBeGreaterThan(0)
  })

  it('renders matrix content with keyboard shortcuts section', () => {
    render(<HelpDialog tab="matrix" onClose={() => {}} />)
    expect(screen.getByText('Hướng dẫn — Tab Bảng tổng')).toBeInTheDocument()
    expect(screen.getByText('Phím tắt')).toBeInTheDocument()
  })

  it('close button invokes onClose', () => {
    const onClose = vi.fn()
    const { container } = render(<HelpDialog tab="personal" onClose={onClose} />)
    const btns = container.querySelectorAll('button')
    // 2nd button is X close (1st is Printer)
    fireEvent.click(btns[1])
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape key closes dialog', () => {
    const onClose = vi.fn()
    render(<HelpDialog tab="personal" onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('click backdrop closes dialog', () => {
    const onClose = vi.fn()
    const { container } = render(<HelpDialog tab="personal" onClose={onClose} />)
    // Outer backdrop = first div
    const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
