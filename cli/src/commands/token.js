import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';

export const tokenCommand = new Command('token')
  .description('Manage API tokens');

tokenCommand
  .command('status')
  .description('Show token validity')
  .requiredOption('--api-id <id>', 'API ID')
  .action(async (options) => {
    const spinner = ora('Checking token status...').start();
    try {
      const response = await api.get(`/api/apis/${options.apiId}`);
      spinner.stop();
      
      const apiData = response.data;
      if (!apiData.token) {
        console.log(chalk.yellow('No token found for this API.'));
        return;
      }

      console.log(`\n${chalk.bold('API:')} ${apiData.name}`);
      console.log(`${chalk.bold('Token Status:')} ${chalk.green('Active')}`);
      console.log(`${chalk.bold('Expires At:')} ${chalk.zinc(apiData.token_expires_at)}`);
      console.log(`${chalk.bold('Last Refresh:')} ${chalk.zinc(apiData.last_refresh || 'Never')}\n`);
    } catch (error) {
      spinner.fail(chalk.red('Failed to check token status.'));
    }
  });

tokenCommand
  .command('refresh')
  .description('Execute manual refresh')
  .requiredOption('--api-id <id>', 'API ID')
  .action(async (options) => {
    const spinner = ora('Refreshing token...').start();
    try {
      const response = await api.post(`/api/apis/${options.apiId}/refresh-token`);
      spinner.succeed(chalk.green('Token refreshed successfully!'));
      console.log(`${chalk.bold('New Token:')} ${chalk.zinc(response.data.token.substring(0, 15) + '...')}`);
    } catch (error) {
      spinner.fail(chalk.red('Failed to refresh token.'));
    }
  });
