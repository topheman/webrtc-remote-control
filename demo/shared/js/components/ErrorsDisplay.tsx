import "./errors-display";

export interface ErrorsDisplayProps {
  data?: string[] | null;
}

export default function ErrorsDisplay({ data }: ErrorsDisplayProps) {
  return <errors-display data={data ?? undefined}></errors-display>;
}
