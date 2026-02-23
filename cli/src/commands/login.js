import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { setConfig } from '../services/config.js';
import { api } from '../services/api.js';

export const loginCommand = new Command('login')
  .description('Register API_KEY locally')
  .requiredOption('--api-key <key>', 'Your Loki API Key')
  .action(async (options) => {
    const spinner = ora('Validating API Key...').start();
    
    try {
      // Temporarily set config to validate
      setConfig('api_key', options.apiKey);
      
      const response = await api.get('/api/auth/me');
      
      if (response.data) {
        spinner.succeed(chalk.green(`Successfully authenticated as ${chalk.bold(response.data.username)}`));
        console.log(chalk.zinc('Configuration saved to ~/.loki/config.json'));
      }
    } catch (error) {
      spinner.fail(chalk.red('Authentication failed. Please check your API key.'));
      // Clear invalid key
      setConfig('api_key', '');
    }
  });
