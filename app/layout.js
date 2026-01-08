import './globals.css'

export const metadata = {
  title: 'Voice Calendar Agent',
  description: 'AI-powered voice calendar assistant with WebRTC',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  )
}
