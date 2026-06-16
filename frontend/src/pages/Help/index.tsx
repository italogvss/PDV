import { useEffect, useState } from 'react'
import { Box, CircularProgress, Divider, Typography } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import RocketLaunchRounded from '@mui/icons-material/RocketLaunchRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded'
import BuildRounded from '@mui/icons-material/BuildRounded'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'
import PeopleRounded from '@mui/icons-material/PeopleRounded'
import BadgeRounded from '@mui/icons-material/BadgeRounded'
import AccountBalanceRounded from '@mui/icons-material/AccountBalanceRounded'
import BusinessRounded from '@mui/icons-material/BusinessRounded'
import ManageAccountsRounded from '@mui/icons-material/ManageAccountsRounded'
import HelpRounded from '@mui/icons-material/HelpRounded'
import type { SvgIconComponent } from '@mui/icons-material'
import MarkdownRenderer from '../../components/MarkdownRenderer'

interface Article {
  slug: string
  title: string
}

interface HelpCategory {
  slug: string
  category: string
  icon: string
  articles: Article[]
}

const ICON_MAP: Record<string, SvgIconComponent> = {
  RocketLaunch: RocketLaunchRounded,
  ShoppingCart: ShoppingCartRounded,
  Inventory2: Inventory2Rounded,
  Build: BuildRounded,
  CalendarMonth: CalendarMonthRounded,
  People: PeopleRounded,
  Badge: BadgeRounded,
  AccountBalance: AccountBalanceRounded,
  Business: BusinessRounded,
  ManageAccounts: ManageAccountsRounded,
  Help: HelpRounded,
}

export default function HelpPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [index, setIndex] = useState<HelpCategory[] | null>(null)
  const [markdownContent, setMarkdownContent] = useState<string | null>(null)
  const [loadingIndex, setLoadingIndex] = useState(true)
  const [loadingMd, setLoadingMd] = useState(false)

  const activeCat = searchParams.get('cat')
  const activeArt = searchParams.get('art')

  useEffect(() => {
    fetch('/help/index.json')
      .then((r) => r.json())
      .then((data: HelpCategory[]) => {
        setIndex(data)
        if (!searchParams.get('cat') || !searchParams.get('art')) {
          const first = data[0]
          const firstArt = first?.articles[0]
          if (first && firstArt) {
            setSearchParams({ cat: first.slug, art: firstArt.slug }, { replace: true })
          }
        }
      })
      .finally(() => setLoadingIndex(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeCat || !activeArt) return
    setLoadingMd(true)
    setMarkdownContent(null)
    fetch(`/help/${activeCat}/${activeArt}.md`)
      .then((r) => r.text())
      .then(setMarkdownContent)
      .finally(() => setLoadingMd(false))
  }, [activeCat, activeArt])

  const handleSelect = (catSlug: string, artSlug: string) => {
    setSearchParams({ cat: catSlug, art: artSlug }, { replace: true })
  }

  const activeCategory = index?.find((c) => c.slug === activeCat)
  const activeArticle = activeCategory?.articles.find((a) => a.slug === activeArt)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
      <Box>
        <Typography variant="h4" color="text.primary" sx={{ lineHeight: 1.15, fontWeight: 700 }}>
          Ajuda
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {activeArticle ? activeArticle.title : 'Encontre respostas para suas dúvidas'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 4, flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <Box
          component="nav"
          sx={{
            width: 220,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            overflowY: 'auto',
          }}
        >
          {loadingIndex ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            index?.map((cat, catIndex) => {
              const Icon = ICON_MAP[cat.icon]
              return (
                <Box key={cat.slug}>
                  {catIndex > 0 && <Divider sx={{ borderColor: 'border.subtle', my: 1 }} />}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75 }}>
                    {Icon && (
                      <Icon sx={{ fontSize: 14, color: 'text.tertiary', flexShrink: 0 }} />
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.tertiary',
                        fontWeight: 600,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {cat.category}
                    </Typography>
                  </Box>

                  {cat.articles.map((art) => {
                    const active = activeCat === cat.slug && activeArt === art.slug
                    return (
                      <Box
                        key={art.slug}
                        onClick={() => handleSelect(cat.slug, art.slug)}
                        sx={{
                          px: 2,
                          py: 1.25,
                          borderRadius: 2,
                          cursor: 'pointer',
                          userSelect: 'none',
                          color: active ? 'text.primary' : 'text.secondary',
                          bgcolor: active ? 'background.paper' : 'transparent',
                          boxShadow: active ? (t) => t.customShadows.xs : 'none',
                          border: 1,
                          borderColor: active ? 'border.subtle' : 'transparent',
                          transition: 'background-color 0.15s, color 0.15s',
                          '&:hover': {
                            bgcolor: active ? 'background.paper' : 'surface.raised',
                            color: 'text.primary',
                          },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: active ? 600 : 400,
                            color: 'inherit',
                            lineHeight: 1.4,
                            fontSize: '0.8125rem',
                          }}
                        >
                          {art.title}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              )
            })
          )}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto', pb: 4 }}>
          {loadingMd ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
              <CircularProgress size={32} />
            </Box>
          ) : markdownContent ? (
            <MarkdownRenderer content={markdownContent} />
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}
