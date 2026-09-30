export function ResultsPlaceholder({ action }: { action: "Calculate" | "Analyze" }) {
  return (
    <div className="flex h-[400px] items-center justify-center text-muted-foreground">
      <p>Click "{action}" to see results</p>
    </div>
  )
}
