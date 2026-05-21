declare module 'cookie' {
  export function parse(str: string, options?: unknown): Record<string, string>;
  export function serialize(name: string, val: string, options?: unknown): string;
}
