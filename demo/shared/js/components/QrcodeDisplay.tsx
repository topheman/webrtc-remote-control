import "./qrcode-display";

export interface QrcodeDisplayProps {
  data?: string;
}

export default function QrcodeDisplay({ data }: QrcodeDisplayProps) {
  return (
    <qrcode-display
      width="160"
      height="160"
      data={JSON.stringify(data)}
    ></qrcode-display>
  );
}
