"use client";

interface Props {
  label: string;
  score: number;
  color?: string;
}

export function ScoreCard({ label, score, color = "#22c55e" }: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col gap-3">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-gray-400 text-sm pb-1">/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
