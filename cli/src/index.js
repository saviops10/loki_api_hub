import { Command } from 'commander';
import chalk from 'chalk';
import { loginCommand } from './commands/login.js';
import { deployCommand } from './commands/deploy.js';
import { apisCommand } from './commands/apis.js';
import { endpointsCommand } from './commands/endpoints.js';
import { callCommand } from './commands/call.js';
import { tokenCommand } from './commands/token.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('loki')
  .description('Professional CLI for Loki API Management Platform')
  .version('1.0.0');

program.addCommand(loginCommand);
program.addCommand(deployCommand);
program.addCommand(apisCommand);
program.addCommand(endpointsCommand);
program.addCommand(callCommand);
program.addCommand(tokenCommand);
program.addCommand(configCommand);

program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s\nSee --help for a list of available commands.'), program.args.join(' '));
  process.exit(1);
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
