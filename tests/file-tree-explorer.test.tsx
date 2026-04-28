// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { FileEntry } from '../src/shared/types'

// Replace Node's experimental localStorage (which needs a file path)
// with an in-memory shim so the component's getItem/setItem work in tests.
{
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size
      }
    }
  })
}

// Stub shiki so highlightCode resolves without WASM in jsdom.
vi.mock('shiki', () => ({
  createHighlighter: async () => ({
    loadLanguage: async () => undefined,
    codeToTokens: () => ({ tokens: [] })
  }),
  createJavaScriptRegexEngine: () => ({})
}))

// jsdom doesn't implement scrollIntoView; the find-cycle effect calls it.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {}
}

const mockListDir = vi.fn<(path: string) => Promise<FileEntry[]>>()
const mockReadFileContent = vi.fn<(path: string) => Promise<string | null>>()
const mockWriteFileContent =
  vi.fn<(path: string, content: string) => Promise<{ success: boolean; error?: string }>>()

Object.defineProperty(window, 'api', {
  value: {
    listDir: (...args: unknown[]) => mockListDir(...(args as [string])),
    readFileContent: (...args: unknown[]) => mockReadFileContent(...(args as [string])),
    writeFileContent: (...args: unknown[]) => mockWriteFileContent(...(args as [string, string]))
  },
  writable: true,
  configurable: true
})

import { FileTreeExplorer } from '../src/renderer/components/FileTreeExplorer'

const ROOT_ENTRIES: FileEntry[] = [
  { name: 'src', path: '/repo/src', isDirectory: true },
  { name: 'tests', path: '/repo/tests', isDirectory: true },
  { name: 'README.md', path: '/repo/README.md', isDirectory: false }
]

const SRC_CHILDREN: FileEntry[] = [
  { name: 'index.ts', path: '/repo/src/index.ts', isDirectory: false },
  { name: 'utils.ts', path: '/repo/src/utils.ts', isDirectory: false }
]

beforeEach(() => {
  mockListDir.mockReset()
  mockReadFileContent.mockReset()
  mockWriteFileContent.mockReset()
  localStorage.clear()

  mockListDir.mockImplementation(async (path: string) => {
    if (path === '/repo') return ROOT_ENTRIES
    if (path === '/repo/src') return SRC_CHILDREN
    if (path === '/repo/tests') return []
    return []
  })
  mockReadFileContent.mockResolvedValue('hello\nworld\nworld again')
  mockWriteFileContent.mockResolvedValue({ success: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderTree(): Promise<void> {
  await act(async () => {
    render(<FileTreeExplorer cwd="/repo" />)
  })
  await screen.findByText('Files')
}

describe('FileTreeExplorer', () => {
  it('renders root entries with chevron-only directories', async () => {
    await renderTree()
    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('tests')).toBeInTheDocument()
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })

  it('filters tree by name and shows empty hint when no matches', async () => {
    await renderTree()
    const filter = screen.getByPlaceholderText('Filter files…')

    await act(async () => {
      fireEvent.change(filter, { target: { value: 'README' } })
    })
    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.queryByText('src')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.change(filter, { target: { value: 'zzznomatch' } })
    })
    expect(screen.getByText(/No matching files loaded/)).toBeInTheDocument()
  })

  it('expands a directory on chevron click and lists children', async () => {
    await renderTree()
    await act(async () => {
      fireEvent.click(screen.getByText('src'))
    })
    await screen.findByText('index.ts')
    expect(screen.getByText('utils.ts')).toBeInTheDocument()
    expect(mockListDir).toHaveBeenCalledWith('/repo/src', undefined)
  })

  it('shows the File panel only after selecting a file', async () => {
    await renderTree()
    expect(screen.queryByText('File')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByText('README.md'))
    })
    await screen.findByText('File')
    // Path strip in File panel header reflects the relative path.
    expect(screen.getByTitle('/repo/README.md')).toBeInTheDocument()
    expect(mockReadFileContent).toHaveBeenCalledWith('/repo/README.md', undefined, undefined)
  })

  it('opens find bar, counts matches, and cycles with Enter', async () => {
    await renderTree()
    await act(async () => {
      fireEvent.click(screen.getByText('README.md'))
    })
    await screen.findByText('File')

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Find in file'))
    })

    const input = await screen.findByPlaceholderText('Find in file')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'world' } })
    })

    expect(screen.getByText('1/2')).toBeInTheDocument()

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    expect(screen.getByText('2/2')).toBeInTheDocument()

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape' })
    })
    expect(screen.queryByPlaceholderText('Find in file')).not.toBeInTheDocument()
  })

  it('edits file and saves through writeFileContent', async () => {
    await renderTree()
    await act(async () => {
      fireEvent.click(screen.getByText('README.md'))
    })
    await waitFor(() =>
      expect((screen.getByLabelText('Edit') as HTMLButtonElement).disabled).toBe(false)
    )

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Edit'))
    })

    const textarea = (await waitFor(() => {
      const t = document.querySelector('textarea')
      if (!t) throw new Error('textarea not yet rendered')
      return t
    })) as HTMLTextAreaElement
    expect(textarea.value).toBe('hello\nworld\nworld again')

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'hello\nchanged' } })
    })

    await act(async () => {
      fireEvent.keyDown(textarea, { key: 's', metaKey: true })
    })

    await waitFor(() =>
      expect(mockWriteFileContent).toHaveBeenCalledWith(
        '/repo/README.md',
        'hello\nchanged',
        undefined
      )
    )
    await screen.findByLabelText('Edit')
  })

  it('confirms before discarding unsaved edits when switching files', async () => {
    await renderTree()
    await act(async () => {
      fireEvent.click(screen.getByText('README.md'))
    })
    await waitFor(() =>
      expect((screen.getByLabelText('Edit') as HTMLButtonElement).disabled).toBe(false)
    )

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Edit'))
    })
    const textarea = (await waitFor(() => {
      const t = document.querySelector('textarea')
      if (!t) throw new Error('textarea not yet rendered')
      return t
    })) as HTMLTextAreaElement
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'dirty content' } })
    })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockReadFileContent.mockClear()

    await act(async () => {
      fireEvent.click(screen.getByText('src'))
    })
    await screen.findByText('index.ts')

    await act(async () => {
      fireEvent.click(screen.getByText('index.ts'))
    })

    expect(confirmSpy).toHaveBeenCalled()
    expect(mockReadFileContent).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('shows binary fallback when readFileContent returns null', async () => {
    mockReadFileContent.mockResolvedValueOnce(null)
    await renderTree()
    await act(async () => {
      fireEvent.click(screen.getByText('README.md'))
    })
    expect(await screen.findByText('Binary file — preview unavailable')).toBeInTheDocument()
  })

  it('returns Empty directory when root has no entries', async () => {
    mockListDir.mockResolvedValueOnce([])
    await act(async () => {
      render(<FileTreeExplorer cwd="/empty" />)
    })
    expect(await screen.findByText('Empty directory')).toBeInTheDocument()
  })

  it('persists split ratio to localStorage on pointerup', async () => {
    await renderTree()
    await act(async () => {
      fireEvent.click(screen.getByText('README.md'))
    })
    await screen.findByText('File')

    const divider = screen.getByRole('separator')
    const container = divider.parentElement as HTMLElement
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      right: 400,
      bottom: 1000,
      width: 400,
      height: 1000,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })

    await act(async () => {
      fireEvent.pointerDown(divider, { clientY: 500 })
    })
    await act(async () => {
      fireEvent(document, new PointerEvent('pointermove', { clientY: 700 }))
    })
    expect(localStorage.getItem('vorn:files-split-ratio')).toBeNull()

    await act(async () => {
      fireEvent(document, new PointerEvent('pointerup'))
    })
    const stored = localStorage.getItem('vorn:files-split-ratio')
    expect(stored).not.toBeNull()
    expect(Number(stored)).toBeCloseTo(0.7, 1)
  })
})
