import { createWriteStream } from 'node:fs';

/**
 * Se LOG_FILE estiver definida, tudo o que a aplicação escreve no terminal
 * (stdout e stderr) também é gravado nesse arquivo. No Docker, o arquivo fica
 * num volume, então os logs sobrevivem quando o container é recriado.
 */
export function enableFileLog() {
  const logFile = process.env.LOG_FILE;
  if (!logFile) return;

  const file = createWriteStream(logFile, { flags: 'a' });

  for (const stream of [process.stdout, process.stderr]) {
    const originalWrite = stream.write.bind(stream);
    stream.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
      file.write(chunk);
      return (originalWrite as (...a: unknown[]) => boolean)(chunk, ...args);
    }) as typeof stream.write;
  }
}
