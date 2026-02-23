import Conf from 'conf';

const schema = {
  api_key: {
    type: 'string',
  },
  environment: {
    type: 'string',
    default: 'production',
  },
  base_url: {
    type: 'string',
    default: 'http://localhost:3000',
  },
};

const config = new Conf({
  projectName: 'loki-cli',
  schema,
});

export const getConfig = () => config.store;
export const setConfig = (key, value) => config.set(key, value);
export const clearConfig = () => config.clear();
export const hasConfig = (key) => config.has(key);
