export interface RemoteCountControlProps {
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

export default function RemoteCountControl({
  onIncrement,
  onDecrement,
  disabled,
}: RemoteCountControlProps) {
  return (
    <div className="counter-control">
      <button
        type="button"
        className="counter-control-add"
        onClick={() => onIncrement()}
        style={{ marginRight: "2px" }}
        disabled={disabled}
      >
        +
      </button>
      <button
        type="button"
        className="counter-control-sub"
        onClick={() => onDecrement()}
        style={{ marginLeft: "2px" }}
        disabled={disabled}
      >
        -
      </button>
    </div>
  );
}
