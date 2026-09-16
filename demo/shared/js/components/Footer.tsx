import "./footer-display";

export interface FooterDisplayProps {
  from?: number | string;
  to?: number | string;
}

export default function FooterDisplay({ from, to }: FooterDisplayProps) {
  return <footer-display from={from} to={to}></footer-display>;
}
