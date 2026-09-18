export interface RemoteNameControlProps {
  onChangeName: (name: string) => void;
  onConfirmName: () => void;
  name?: string;
  disabled?: boolean;
}

export default function RemoteNameControl({
  onChangeName,
  onConfirmName,
  name,
  disabled,
}: RemoteNameControlProps) {
  return (
    <form
      className="form-set-name"
      action="."
      onSubmit={(e) => {
        e.preventDefault();
        onConfirmName();
      }}
      // `disabled` is not a valid attribute on `<form>`, but React renders it
      // and the pre-TypeScript component set it. Kept through a spread so the
      // rendered DOM is unchanged; the controls inside carry their own
      // `disabled`, which is the one that does anything.
      {...{ disabled }}
    >
      <label>
        <input
          type="text"
          placeholder="Enter name"
          onChange={(e) => onChangeName(e.target.value)}
          value={name}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled}>
          OK
        </button>
      </label>
    </form>
  );
}
