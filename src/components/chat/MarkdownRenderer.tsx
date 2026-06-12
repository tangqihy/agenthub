/**
 * MarkdownRenderer - Full markdown rendering with syntax highlighting
 * Uses react-markdown + remark-gfm + prism syntax highlighting
 * Lazy-loads syntax highlighter for mobile performance
 */
import { memo, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import './MarkdownRenderer.scss'

// Lazy-load the heavy syntax highlighter bundle
const LazyHighlighter = lazy(() =>
  import('react-syntax-highlighter').then(mod => {
    // Import Prism and the theme
    const { Prism } = mod
    return import('react-syntax-highlighter/dist/cjs/styles/prism').then(themeMod => {
      const HighlighterComponent = (props: any) => {
        return <Prism {...props} style={themeMod.oneDark} />
      }
      HighlighterComponent.displayName = 'PrismHighlighter'
      return { default: HighlighterComponent }
    })
  })
)

interface CodeBlockProps {
  code: string
  language: string
  isDiff?: boolean
}

function CodeBlock({ code, language, isDiff }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code)
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = code
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silent fail
    }
  }, [code])

  const langLabel = language || 'text'

  // Diff view: render lines with add/remove/hunk styling
  const diffLines = useMemo(() => {
    if (!isDiff) return null
    return code.split('\n').map((line, i) => {
      let className = ''
      if (line.startsWith('+') && !line.startsWith('+++')) {
        className = 'diff-add'
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        className = 'diff-remove'
      } else if (line.startsWith('@@')) {
        className = 'diff-hunk'
      }
      return { line, className, key: i }
    })
  }, [code, isDiff])

  return (
    <div className='code-block'>
      {/* Header with language label and copy button */}
      <div className='code-header'>
        <span className='code-lang'>{langLabel}</span>
        <button className='code-copy-btn' onClick={handleCopy} type='button'>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      <div className='code-content'>
        {isDiff && diffLines ? (
          <pre className='code-pre'>
            <code>
              {diffLines.map(({ line, className, key }) => (
                <div key={key} className={className}>
                  {line || '\u00A0'}
                </div>
              ))}
            </code>
          </pre>
        ) : (
          <Suspense
            fallback={
              <pre className='code-pre'>
                <code>{code}</code>
              </pre>
            }
          >
            <LazyHighlighter
              language={language || 'text'}
              PreTag='div'
              customStyle={{
                background: 'transparent',
                padding: 0,
                margin: 0,
                fontSize: '13px',
                lineHeight: '1.5',
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'var(--font-mono)',
                },
              }}
            >
              {code}
            </LazyHighlighter>
          </Suspense>
        )}
      </div>
    </div>
  )
}

CodeBlock.displayName = 'CodeBlock'

interface AgentMarkdownProps {
  children: string
}

function AgentMarkdownInner({ children }: AgentMarkdownProps) {
  // Custom component renderers for react-markdown
  const components: Components = useMemo(
    () => ({
      code({ className, children: codeChildren, ...props }) {
        const codeString = String(codeChildren).replace(/\n$/, '')
        const match = /language-(\w+)/.exec(className || '')
        const isInline = !match && !className

        if (isInline) {
          return (
            <code className='inline-code' {...props}>
              {codeChildren}
            </code>
          )
        }

        const language = match ? match[1] : ''
        const isDiff = language === 'diff' || codeString.split('\n').some(l => l.startsWith('+') || l.startsWith('-') || l.startsWith('@@'))

        return <CodeBlock code={codeString} language={language} isDiff={isDiff} />
      },

      pre({ children: preChildren }) {
        // Let the code component handle rendering; strip default pre styling
        return <>{preChildren}</>
      },

      a({ href, children: linkChildren }) {
        return (
          <a
            href={href}
            target='_blank'
            rel='noopener noreferrer'
          >
            {linkChildren}
          </a>
        )
      },

      img({ src, alt }) {
        return (
          <img
            src={src}
            alt={alt || ''}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: 'var(--radius-sm)' }}
            loading='lazy'
          />
        )
      },

      table({ children: tableChildren }) {
        return (
          <div className='table-wrapper'>
            <table>{tableChildren}</table>
          </div>
        )
      },
    }),
    []
  )

  return (
    <div className='markdown-body'>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

AgentMarkdownInner.displayName = 'AgentMarkdown'

export const MarkdownRenderer = memo(AgentMarkdownInner)
export default MarkdownRenderer
