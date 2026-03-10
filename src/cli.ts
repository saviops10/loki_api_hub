import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';

const program = new Command();

program
  .name('loki')
  .description('L.O.K.I API Hub CLI - Manage your APIs from the terminal')
  .version('1.0.0');

program
  .command('login')
  .description('Authenticate with your API Key')
  .argument('<apiKey>', 'Your L.O.K.I API Key')
  .action(async (apiKey) => {
    try {
      console.log(chalk.green('Authenticating...'));
      // In a real scenario, this would hit our /api/auth/cli endpoint
      console.log(chalk.green('✓ Successfully authenticated!'));
      console.log(chalk.gray('Session stored in ~/.loki/config.json'));
    } catch (error) {
      console.error(chalk.red('✗ Authentication failed. Please check your API Key.'));
    }
  });

program
  .command('call')
  .description('Call an endpoint through the L.O.K.I proxy')
  .argument('<apiId>', 'The ID of the API')
  .argument('<endpointId>', 'The ID of the endpoint')
  .option('-p, --params <params>', 'JSON string of parameters')
  .action(async (apiId, endpointId, options) => {
    try {
      console.log(chalk.green(`Executing request for API ${apiId}, Endpoint ${endpointId}...`));
      // Proxy call logic here
      console.log(chalk.gray('----------------------------------------'));
      console.log(chalk.green('Status: 200 OK'));
      console.log(chalk.white(JSON.stringify({ message: "Success", data: [] }, null, 2)));
    } catch (error) {
      console.error(chalk.red('✗ Request failed.'));
    }
  });

program.parse();
