import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig, setConfig, clearConfig } from '../services/config.js';

export const configCommand = new Command('config')
  .description('Manage local configuration');

configCommand
  .command('list')
  .description('List all configuration')
  .action(() => {
    const config = getConfig();
    console.log(chalk.bold.white('\nLocal Configuration:'));
    console.log(chalk.zinc('--------------------------------------------------'));
    Object.entries(config).forEach(([key, value]) => {
      const displayValue = key === 'api_key' ? '********' + value.slice(-4) : value;
      console.log(`${chalk.emerald(key.padEnd(15))} : ${displayValue}`);
    });
    console.log(chalk.zinc('--------------------------------------------------\n'));
  });

configCommand
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Config key (api_key, environment, base_url)')
  .argument('<value>', 'Config value')
  .action((key, value) => {
    setConfig(key, value);
    console.log(chalk.green(`Successfully set ${chalk.bold(key)} to ${chalk.bold(value)}`));
  });

configCommand
  .command('clear')
  .description('Clear all configuration')
  .action(() => {
    clearConfig();
    console.log(chalk.yellow('Configuration cleared.'));
  });
