import type { Components } from 'react-markdown'
import { Box, Divider, Link, Typography } from '@mui/material'
import type { Props } from './types'
import ReactMarkdown from 'react-markdown'

const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h2" gutterBottom>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h3" gutterBottom sx={{ mt: 3,mb: 2 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5, pl: 1.5 }}>
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
  ul: ({ children }) => (
    <Box component="ul" sx={{ pl: 3, mb: 1.5 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ pl: 3, mb: 1.5 }}>
      {children}
    </Box>
  ),
  a: ({ href, children }) => (
    <Link href={href} color="secondary.main">
      {children}
    </Link>
  ),
  hr: () => <Divider sx={{ my: 2 }} />,
  blockquote: ({ children }) => (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'secondary.main',
        bgcolor: 'surface.sunken',
        borderRadius: 1,
        color: 'text.secondary',
        p: 2.5,
        my: 2,
        mr: 10, 
        '& p': { mb: 0 },
      }}
    >
      {children}
    </Box>
  ),
  code: ({ children }) => (
    <Typography
      component="code"
      sx={{
        fontFamily: 'monospace',
        bgcolor: 'surface.raised',
        px: 0.5,
        borderRadius: 0,
        fontSize: '0.95em',
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
