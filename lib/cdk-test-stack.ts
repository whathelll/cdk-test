import * as cdk from '@aws-cdk/core';
import { HelloConstruct } from '../constructs/hello-construct';

export class CdkTestStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const helloStack = new HelloConstruct(this, "HelloConstruct");

  }
}
