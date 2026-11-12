import { createWriteStream } from 'node:fs';

/**
 * Se LOG_FILE estiver definida, tudo o que a aplicação escreve no terminal
 * (stdout e stderr) também é gravado nesse arquivo. No Docker, o arquivo fica
 * numa pasta montada do host, então os logs sobrevivem quando o container é recriado.
 */
export function enableFileLog() {
  const logFile = process.env.LOG_FILE;
  if (!logFile) return;

  const file = createWriteStream(logFile, { flags: 'a' });

  // Se o arquivo não puder ser aberto (ex.: pasta sem permissão de escrita),
  // a aplicação continua funcionando, apenas sem o log em arquivo.
  file.on('error', (error) => {
    file.destroy();
    process.stderr.write(`Aviso: log em arquivo desativado (${error.message})\n`);
  });

  for (const stream of [process.stdout, process.stderr]) {
    const originalWrite = stream.write.bind(stream);
    stream.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
      file.write(chunk);
      return (originalWrite as (...a: unknown[]) => boolean)(chunk, ...args);
    }) as typeof stream.write;
  }
}
