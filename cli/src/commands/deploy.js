import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import { api } from '../services/api.js';

export const deployCommand = new Command('deploy')
  .description('Register or update API external on the platform')
  .option('--file <path>', 'Path to API configuration JSON file')
  .action(async (options) => {
    if (!options.file) {
      console.error(chalk.red('Error: --file option is required for deploy.'));
      return;
    }

    const spinner = ora('Deploying API configuration...').start();
    
    try {
      const configData = JSON.parse(fs.readFileSync(options.file, 'utf8'));
      
      const response = await api.post('/api/apis', configData);
      
      spinner.succeed(chalk.green(`API deployed successfully! ID: ${chalk.bold(response.data.id)}`));
    } catch (error) {
      if (error.code === 'ENOENT') {
        spinner.fail(chalk.red(`File not found: ${options.file}`));
      } else {
        spinner.fail(chalk.red('Deployment failed.'));
      }
    }
  });
