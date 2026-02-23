import axios from 'axios';
import { getConfig } from './config.js';
import chalk from 'chalk';

const getClient = () => {
  const { api_key, base_url } = getConfig();
  
  const client = axios.create({
    baseURL: base_url,
    timeout: 10000,
    headers: {
      'x-loki-api-key': api_key,
      'Content-Type': 'application/json',
    },
  });

  // Middleware to handle errors
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        if (error.response.status === 401) {
          console.error(chalk.red('\nError: Unauthorized. Please check your API key or login again.'));
        } else if (error.response.status === 403) {
          console.error(chalk.red('\nError: Forbidden. You do not have access to this resource.'));
        } else {
          console.error(chalk.red(`\nError: ${error.response.data?.error || error.message}`));
        }
      } else {
        console.error(chalk.red('\nError: Could not connect to the Loki server.'));
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const api = {
  get: (url, config) => getClient().get(url, config),
  post: (url, data, config) => getClient().post(url, data, config),
  put: (url, data, config) => getClient().put(url, data, config),
  delete: (url, config) => getClient().delete(url, config),
};
