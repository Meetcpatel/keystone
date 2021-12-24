import { randomBytes } from 'crypto';
import Conf from 'conf';
import fetch from 'node-fetch';
import { GraphQLSchema } from 'graphql';
import { ListSchemaConfig } from '../../types';
import { defaults } from '../config/defaults';
import { deviceInfo } from './deviceInfo';
import { projectInfo } from './projectInfo';

// Load global telemetry config settings (if set)
const userConfig = new Conf({ projectName: 'keystonejs' });
const userTelemetryNotified = userConfig.get('telemetry.notified');
const userTelemetryDisabled = userConfig.get('telemetry.disabled');

// The device ID is a generated random 256 bit ID
let deviceId = userConfig.get('telemetry.deviceId') as string | undefined;

// The salt is a generated random 256 bit ID that is stored on the client and
// used as a salt to hash any potentially identifying IDs before sending
let salt = userConfig.get('telemetry.salt') as string | undefined;

if (userTelemetryDisabled) {
  process.env.KEYSTONE_TELEMETRY_DISABLED = '1';
}

const telemetryDisabled = () => {
  return (
    !!process.env.KEYSTONE_TELEMETRY_DISABLED &&
    process.env.KEYSTONE_TELEMETRY_DISABLED !== '0' &&
    process.env.KEYSTONE_TELEMETRY_DISABLED !== 'false'
  );
};

// If Keystone telemetry is disabled also disable NextJS & Prisma telemetry
if (telemetryDisabled()) {
  process.env.NEXT_TELEMETRY_DISABLED = '1';
  process.env.CHECKPOINT_DISABLE = '1';
}

const notify = () => {
  // Only nag the user once about this
  if (!userTelemetryNotified) {
    console.log(`
ℹ️  Keystone collects completely anonymous usage data. 
The data Keystone collects is anonymised and aggregated, and helps us better support Keystone.
For more details, including how to opt-out, visit: https://keystonejs.com/telemetry
`);
    // Save as a date incase we want to re-notify in the future
    userConfig.set('telemetry.notified', new Date().toISOString());
  }
};

export function sendTelemetryEvent(
  eventType: string,
  cwd: string,
  dbProvider: string,
  lists: ListSchemaConfig,
  graphQLSchema: GraphQLSchema
) {
  try {
    if (telemetryDisabled()) {
      return;
    }

    notify();

    if (!deviceId) {
      deviceId = randomBytes(32).toString('hex');
      userConfig.set('telemetry.deviceId', deviceId);
    }

    if (!salt) {
      salt = randomBytes(32).toString('hex');
      userConfig.set('telemetry.salt', salt);
    }

    const eventData = {
      deviceId,
      ...deviceInfo(),
      ...projectInfo(cwd, lists, graphQLSchema, salt),
      dbProvider,
      eventType,
    };

    const telemetryEndpoint = process.env.KEYSTONE_TELEMETRY_ENDPOINT || defaults.telemetryEndpoint;
    const telemetryUrl = `${telemetryEndpoint}/v1/event`;

    if (process.env.KEYSTONE_TELEMETRY_DEBUG === '1') {
      console.log(`[Telemetry]: ${telemetryUrl}`);
      console.log(eventData);
    } else {
      // Do not `await` to keep non-blocking
      fetch(telemetryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })
        .then(
          () => {},
          () => {}
        )
        // Catch silently
        .catch(() => {});
    }
  } catch (err) {
    // Fail silently
  }
}