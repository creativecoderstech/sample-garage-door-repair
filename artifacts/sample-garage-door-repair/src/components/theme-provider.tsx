import { createContext, useContext, useEffect, useState } from "react"
import { useGetBusinessSettings } from "@workspace/api-client-react"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
}

type ThemeProviderState = {
  theme: string
  setTheme: (theme: string) => void
}

const initialState: ThemeProviderState = {
  theme: "industrial",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "industrial",
  storageKey = "garage-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<string>(
    () => (localStorage.getItem(storageKey) as string) || defaultTheme
  )

  const { data: settings } = useGetBusinessSettings()

  useEffect(() => {
    const root = window.document.documentElement
    
    // Always use the setting from the backend if it exists, otherwise use local/default
    const activeTheme = settings?.theme || theme

    // Remove all possible theme classes
    root.classList.remove("light", "dark")
    root.removeAttribute("data-theme")

    // We don't really support dark mode right now, keeping everything light-based 
    // for this specific industrial app feeling. Just applying the data-theme
    if (activeTheme !== "industrial") {
        root.setAttribute("data-theme", activeTheme)
    }

  }, [theme, settings?.theme])

  const value = {
    theme: settings?.theme || theme,
    setTheme: (theme: string) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
