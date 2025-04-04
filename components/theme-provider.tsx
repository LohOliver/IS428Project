import { ThemeProvider as NextThemesProvider } from 'next-themes'

// Define props interface manually 
type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: string;
  enableSystem?: boolean;
  // Add other props as needed
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}