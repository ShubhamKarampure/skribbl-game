interface LoadingStateProps {
  roomId: string
  error: string | null
}

export default function LoadingState({ roomId, error }: LoadingStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Loading Game: {roomId.toUpperCase()}...</p>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  )
}
