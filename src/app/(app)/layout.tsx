import Sidebar from '@/components/sidebar'
import AccentProvider from '@/components/accent-provider'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <>
      <AccentProvider />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 bg-card overflow-auto">
          {children}
        </main>
      </div>
    </>
  )
}
