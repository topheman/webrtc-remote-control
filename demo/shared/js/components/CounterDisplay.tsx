import "./counter-display";

export interface CounterDisplayProps {
  count?: number;
}

export default function CounterDisplay({ count }: CounterDisplayProps) {
  return (
    <counter-display data={count} class="global-counter"></counter-display>
  );
}
