'use client'
import { createContext, use, useEffect, useMemo } from 'react'

import useLocalStorage from '@/hooks/useLocalStorage'
import useQueryParams from '@/hooks/useQueryParams'
import type { ChildrenType } from '@/types/component-props'
import { toggleDocumentAttribute } from '@/utils/layout'
import type { LayoutState, LayoutType, MenuType, ThemeType } from '@/types/context'

const ThemeContext = createContext<LayoutType | undefined>(undefined)

const useLayoutContext = () => {
  const context = use(ThemeContext)
  if (!context) {
    throw new Error('useLayoutContext can only be used within LayoutProvider')
  }
  return context
}

const getPreferredTheme = (): ThemeType => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

const LayoutProvider = ({ children }: ChildrenType) => {
  const queryParams = useQueryParams()

  const override = !!(queryParams.layout_theme  || queryParams.menu_theme || queryParams.menu_size);

  const INIT_STATE: LayoutState = {
    theme: queryParams['layout_theme'] ? (queryParams['layout_theme'] as ThemeType) : getPreferredTheme(),
    menu: {
      theme: queryParams['menu_theme'] ? (queryParams['menu_theme'] as MenuType['theme']) : 'light',
      size: queryParams['menu_size'] ? (queryParams['menu_size'] as MenuType['size']) : 'default',
    },
  }

  const [settings, setSettings] = useLocalStorage<LayoutState>('__RIZZ_NEXT_CONFIG__', INIT_STATE,override)

  // update settings
  const updateSettings = (_newSettings: Partial<LayoutState>) => setSettings({ ...settings, ..._newSettings })

  // update theme mode
  const changeTheme = (newTheme: ThemeType) => {
    updateSettings({ theme: newTheme })
  }

  // change menu theme
  const changeMenuTheme = (newTheme: MenuType['theme']) => {
    updateSettings({ menu: { ...settings.menu, theme: newTheme } })
  }

  // change menu theme
  const changeMenuSize = (newSize: MenuType['size']) => {
    updateSettings({ menu: { ...settings.menu, size: newSize } })
  }

  useEffect(() => {
    toggleDocumentAttribute('data-bs-theme', settings.theme)
    toggleDocumentAttribute('data-startbar', settings.menu.theme)
    toggleDocumentAttribute('data-sidebar-size', settings.menu.size, false, 'body')
    return () => {
      toggleDocumentAttribute('data-bs-theme', settings.theme, true)
      toggleDocumentAttribute('data-startbar', settings.menu.theme, true)
      toggleDocumentAttribute('data-sidebar-size', settings.menu.size, true, 'body')
    }
  }, [settings])

  const resetSettings = () => updateSettings(INIT_STATE)

  return (
    <ThemeContext.Provider
      value={useMemo(
        () => ({
          ...settings,
          themeMode: settings.theme,
          changeTheme,
          changeMenu: {
            theme: changeMenuTheme,
            size: changeMenuSize,
          },
          resetSettings,
        }),
        [settings],
      )}>
      {children}
      <div className="startbar-overlay d-print-none" onClick={() => changeMenuSize('collapsed')} />
    </ThemeContext.Provider>
  )
}

export { LayoutProvider, useLayoutContext }
