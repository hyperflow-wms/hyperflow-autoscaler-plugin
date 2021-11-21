import Engine from './engine';

const args = process.argv.slice(2);
if (args.length != 1) {
  throw Error(`ERROR: 1 argument expected, got ${args.length.toString()}`);
}
const providerName = args[0];
const engine = new Engine(providerName);
engine.run();
