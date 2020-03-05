#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkTestStack } from '../lib/cdk-test-stack';
import { EcsStack } from '../lib/ecs-stack';

const app = new cdk.App();
// new CdkTestStack(app, 'CdkTestStack');
new EcsStack(app, 'EcsStack');
