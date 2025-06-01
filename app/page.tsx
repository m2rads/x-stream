import XConnectionCard from '@/components/XConnectionCard'

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            X Monitor Replies
          </h1>
          <p className="text-muted-foreground">
            Connect your X account to start monitoring replies and mentions
          </p>
        </div>
        <XConnectionCard />
      </div>
    </main>
  )
}
