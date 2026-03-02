"use client";

const BAR_COUNT = 7;

export function VoiceWaveform() {
  return (
    <div className="flex items-center justify-center gap-[5px] h-7" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            animation: `waveform-pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
