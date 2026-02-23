import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';

export const endpointsCommand = new Command('endpoints')
  .description('List endpoints for an API')
  .requiredOption('--api-id <id>', 'API ID')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    const spinner = ora(`Fetching endpoints for API ${options.apiId}...`).start();
    
    try {
      const response = await api.get(`/api/endpoints/${options.apiId}`);
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }

      if (response.data.length === 0) {
        console.log(chalk.yellow('No endpoints found for this API.'));
        return;
      }

      console.log(chalk.bold.white(`\nEndpoints for API ${options.apiId}:`));
      console.log(chalk.zinc('--------------------------------------------------'));
      
      response.data.forEach(ep => {
        const methodColor = ep.method === 'GET' ? chalk.blue : ep.method === 'POST' ? chalk.green : chalk.yellow;
        console.log(`${chalk.emerald('ID:')} ${ep.id.toString().padEnd(5)} | ${methodColor(ep.method.padEnd(6))} | ${chalk.bold(ep.name.padEnd(20))} | ${chalk.zinc(ep.path)}`);
      });
      console.log(chalk.zinc('--------------------------------------------------\n'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch endpoints.'));
    }
  });
