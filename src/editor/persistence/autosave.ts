export type AutosaveStatus<T> =
  | { status: "saved"; value?: T }
  | { status: "saving"; value: T }
  | { status: "unsaved"; value: T }
  | { status: "error"; value: T; error: unknown };

interface AutosaveOptions<T> {
  delayMs?: number;
  onStatus?: (status: AutosaveStatus<T>) => void;
}

export class AutosaveController<T> {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: T | undefined;
  private generation = 0;
  private state: AutosaveStatus<T> = { status: "saved" };

  constructor(
    private readonly save: (value: T) => void | Promise<void>,
    private readonly options: AutosaveOptions<T> = {},
  ) {
    const delay = options.delayMs ?? 750;
    if (!Number.isFinite(delay) || delay < 0) throw new Error("Autosave delay must be a non-negative finite number.");
  }

  get status(): AutosaveStatus<T> {
    return this.state;
  }

  schedule(value: T): void {
    this.generation += 1;
    this.pending = value;
    this.update({ status: "unsaved", value });
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.options.delayMs ?? 750);
  }

  cancel(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = undefined;
    this.generation += 1;
  }

  async flush(): Promise<void> {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.pending === undefined) return;
    const value = this.pending;
    const generation = this.generation;
    this.pending = undefined;
    this.update({ status: "saving", value });
    try {
      await this.save(value);
      if (generation === this.generation) this.update({ status: "saved", value });
    } catch (error) {
      if (generation === this.generation) {
        this.pending = value;
        this.update({ status: "error", value, error });
      }
    }
  }

  private update(status: AutosaveStatus<T>): void {
    this.state = status;
    this.options.onStatus?.(status);
  }
}
