import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';

export const apisCommand = new Command('apis')
  .description('List registered APIs')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    const spinner = ora('Fetching APIs...').start();
    
    try {
      const response = await api.get('/api/apis');
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }

      if (response.data.length === 0) {
        console.log(chalk.yellow('No APIs registered yet.'));
        return;
      }

      console.log(chalk.bold.white('\nRegistered APIs:'));
      console.log(chalk.zinc('--------------------------------------------------'));
      
      response.data.forEach(api => {
        console.log(`${chalk.emerald('ID:')} ${api.id.toString().padEnd(5)} | ${chalk.bold(api.name.padEnd(20))} | ${chalk.zinc(api.base_url)}`);
      });
      console.log(chalk.zinc('--------------------------------------------------\n'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch APIs.'));
    }
  });
