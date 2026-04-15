const timestamp = () => new Date().toISOString();

const write = (level: string, message: string) => {
  console.log(`[${timestamp()}] [${level}] ${message}`);
};

export const logger = {
  section(message: string) {
    write('SECTION', `\n${message}`);
  },
  info(message: string) {
    write('INFO', message);
  },
  warn(message: string) {
    write('WARN', message);
  },
  error(message: string) {
    write('ERROR', message);
  }
};
