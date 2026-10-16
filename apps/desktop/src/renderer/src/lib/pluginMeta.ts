/** An extension as stored: its code and what its header says about it. */
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  code: string;
  enabled: boolean;
  installedAt: number;
}

/** `// @name …`, `// @description …`, `// @version …` at the top of the file */
export function parsePlugin(code: string, fallbackName = 'Estensione'): Omit<Plugin, 'id' | 'enabled' | 'installedAt'> {
  const tag = (k: string) => new RegExp(`^\\s*//\\s*@${k}\\s+(.+)$`, 'm').exec(code)?.[1]?.trim();
  return {
    name: (tag('name') ?? fallbackName).slice(0, 60),
    description: (tag('description') ?? '').slice(0, 200),
    version: (tag('version') ?? '1.0').slice(0, 20),
    code,
  };
}

