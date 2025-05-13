"use client"

interface WordDisplayProps {
  word: string | null
  isDrawing: boolean
  isRoundOver?: boolean
  actualWordAtRoundEnd?: string | null
}

export default function WordDisplay({ word, isDrawing, isRoundOver, actualWordAtRoundEnd }: WordDisplayProps) {
  // If round is over, show the actual word
  if (isRoundOver && actualWordAtRoundEnd) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-sm text-gray-500">The word was:</div>
        <div className="text-2xl font-bold text-green-600">{actualWordAtRoundEnd}</div>
      </div>
    )
  }

  // For the drawer, show the full word
  if (isDrawing && word) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-sm text-gray-500">Your word to draw:</div>
        <div className="text-2xl font-bold">{word}</div>
      </div>
    )
  }

  // For guessing players, show hint or underscores
  if (!isDrawing) {
    // If we have a hint (partial word with underscores), show it
    if (word) {
      return (
        <div className="flex flex-col items-center">
          <div className="text-sm text-gray-500">Guess the word:</div>
          <div className="text-2xl font-bold tracking-widest">{word}</div>
        </div>
      )
    }

    // If no hint yet, show generic underscores
    const placeholderWord = "_ _ _ _ _"
    return (
      <div className="flex flex-col items-center">
        <div className="text-sm text-gray-500">Guess the word:</div>
        <div className="text-2xl font-bold tracking-widest">{placeholderWord}</div>
      </div>
    )
  }

  return null
}
