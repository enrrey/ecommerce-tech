export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variable de entorno faltante: ${name}`);
  }

  return value;
}
