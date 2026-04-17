import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddPersonDialog } from './add-person-dialog'

function renderDialog(overrides: Partial<React.ComponentProps<typeof AddPersonDialog>> = {}) {
  const onClose = vi.fn()
  const onSave = vi.fn()
  const onBulkSave = vi.fn()
  render(<AddPersonDialog open onClose={onClose} onSave={onSave} onBulkSave={onBulkSave} {...overrides} />)
  return { onClose, onSave, onBulkSave }
}

describe('AddPersonDialog', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <AddPersonDialog open={false} onClose={() => {}} onSave={() => {}} onBulkSave={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders single-mode by default with empty disabled submit', () => {
    renderDialog()
    expect(screen.getByText('Thêm người')).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: 'Thêm' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
  })

  it('saves single name with wage 0 when wage field empty', () => {
    const { onSave, onClose } = renderDialog()
    const input = document.querySelector('input[type="text"], input:not([type])') as HTMLInputElement
    fireEvent.change(input, { target: { value: '  Alice  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(onSave).toHaveBeenCalledWith('Alice', 0)
    expect(onClose).toHaveBeenCalled()
  })

  it('passes the entered wage to onSave', () => {
    const { onSave } = renderDialog()
    const inputs = document.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: 'Bob' } })
    fireEvent.change(inputs[1], { target: { value: '150000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(onSave).toHaveBeenCalledWith('Bob', 150000)
  })

  it('switches to bulk mode and parses pasted names', () => {
    const { onBulkSave, onClose } = renderDialog()
    fireEvent.click(screen.getByText('Dán nhiều tên'))
    const ta = document.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'Alice\nBob\n\nAlice\n  Charlie  ' } })
    // 3 unique names after dedupe/trim
    expect(screen.getByText('3 tên hợp lệ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Thêm/ }))
    expect(onBulkSave).toHaveBeenCalledWith(['Alice', 'Bob', 'Charlie'])
    expect(onClose).toHaveBeenCalled()
  })

  it('bulk submit disabled when no valid names', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Dán nhiều tên'))
    const submit = screen.getByRole('button', { name: /^Thêm/ }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
  })

  it('Huỷ button closes dialog', () => {
    const { onClose } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not save empty / whitespace-only name', () => {
    const { onSave } = renderDialog()
    const input = document.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '   ' } })
    const submit = screen.getByRole('button', { name: 'Thêm' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.click(submit)
    expect(onSave).not.toHaveBeenCalled()
  })
})
