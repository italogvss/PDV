import type { Components } from 'react-markdown'
import { Box, Divider, Link, Typography } from '@mui/material'
import type { Props } from './types'
import ReactMarkdown from 'react-markdown'

const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h4" gutterBottom>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
      {children}
    </Typography>
  ),
  strong: ({ children }) => (
    <Typography component="strong" sx={{ fontWeight: 600, color: 'text.primary' }}>
      {children}
    </Typography>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body1" color="text.secondary">
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Link href={href} color="secondary.main">
      {children}
    </Link>
  ),
  hr: () => <Divider sx={{ my: 2 }} />,
  code: ({ children }) => (
    <Typography
      component="code"
      sx={{
        fontFamily: 'monospace',
        bgcolor: 'surface.sunken',
        px: 0.5,
        borderRadius: 1,
        fontSize: '0.85em',
      }}
    >
      {children}
    </Typography>
  ),
  img: ({ src, alt }) => (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{ maxWidth: '100%', borderRadius: 2, my: 2, boxShadow: 1 }}
    />
  ),
}

export default function MarkdownRenderer({ content }: Props) {
  return <ReactMarkdown components={components}>{content}</ReactMarkdown>
}
