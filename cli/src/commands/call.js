import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';

export const callCommand = new Command('call')
  .description('Execute a remote endpoint')
  .requiredOption('--api-id <id>', 'API ID')
  .requiredOption('--endpoint-id <id>', 'Endpoint ID')
  .option('--method <method>', 'HTTP Method (GET, POST, etc.)')
  .option('--body <body>', 'JSON body for the request')
  .option('--json', 'Output raw JSON response')
  .action(async (options) => {
    const spinner = ora('Executing request...').start();
    
    try {
      const payload = {
        apiId: Number(options.apiId),
        endpointId: Number(options.endpointId),
        body: options.body ? JSON.parse(options.body) : {},
      };

      const response = await api.post('/api/proxy', payload);
      spinner.stop();
      
      const { status, data, headers } = response.data;
      
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      const statusColor = status >= 200 && status < 300 ? chalk.green : chalk.red;
      
      console.log(`\n${chalk.bold('Status:')} ${statusColor(status)}`);
      console.log(`${chalk.bold('Response Body:')}`);
      console.log(chalk.zinc('--------------------------------------------------'));
      console.log(JSON.stringify(data, null, 2));
      console.log(chalk.zinc('--------------------------------------------------\n'));
    } catch (error) {
      spinner.fail(chalk.red('Request failed.'));
    }
  });
