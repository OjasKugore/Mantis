import pc from 'picocolors';

export const theme = {
  // Brand colors
  primary: (text: string) => `\x1b[38;2;135;169;107m${text}\x1b[0m`, // Sage Green #87a96b
  primaryBold: (text: string) => `\x1b[1m\x1b[38;2;135;169;107m${text}\x1b[0m`,
  secondary: (text: string) => `\x1b[38;2;74;94;58m${text}\x1b[0m`,   // Dark Olive #4a5e3a
  
  // Status badges
  status: (status: string) => {
    switch (status.toUpperCase()) {
      case 'UNCONFIRMED':
        return pc.yellow(`[UNCONFIRMED]`);
      case 'CONFIRMED':
        return pc.cyan(`[CONFIRMED]`);
      case 'IN_PROGRESS':
        return pc.blue(`[IN_PROGRESS]`);
      case 'RESOLVED':
        return pc.green(`[RESOLVED]`);
      case 'VERIFIED':
        return pc.bold(pc.green(`[VERIFIED]`));
      case 'CLOSED':
        return pc.gray(`[CLOSED]`);
      default:
        return pc.white(`[${status}]`);
    }
  },

  // Priority badges
  priority: (p: string) => {
    switch (p.toUpperCase()) {
      case 'P1':
        return pc.bold(pc.red(`P1`));
      case 'P2':
        return pc.red(`P2`);
      case 'P3':
        return pc.yellow(`P3`);
      case 'P4':
        return pc.cyan(`P4`);
      case 'P5':
        return pc.gray(`P5`);
      default:
        return p;
    }
  },

  // Severity badges
  severity: (s: string) => {
    switch (s.toLowerCase()) {
      case 'blocker':
        return pc.bgRed(pc.white(pc.bold(' BLOCKER ')));
      case 'critical':
        return pc.red(pc.bold('CRITICAL'));
      case 'major':
        return pc.red('MAJOR');
      case 'normal':
        return pc.gray('NORMAL');
      case 'minor':
      case 'trivial':
        return pc.dim(s.toUpperCase());
      default:
        return s.toUpperCase();
    }
  },

  // Banner
  banner: () => {
    const brand = `\x1b[38;2;135;169;107m`;
    const reset = `\x1b[0m`;
    const gray = `\x1b[90m`;
    return [
      `${brand}  __  __          _   _ _____ _____  _____ ${reset}`,
      `${brand} |  \\/  |   /\\   | \\ | |_   _/ ____|/ ____|${reset}`,
      `${brand} | \\  / |  /  \\  |  \\| | | || (___ | (___  ${reset}`,
      `${brand} | |\\/| | / /\\ \\ | . \` | | | \\___ \\ \\___ \\ ${reset}`,
      `${brand} | |  | |/ ____ \\| |\\  |_| |_____) |____) |${reset}`,
      `${brand} |_|  |_/_/    \\_\\_| \\_|_____|_____/|_____/ ${reset}`,
      `${gray} Stealthy monitoring, precise triage · v3.0${reset}\n`,
    ].join('\n');
  },
};
