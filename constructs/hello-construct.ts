import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as apigateway from '@aws-cdk/aws-apigateway'


export class HelloConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);
            // The code that defines your stack goes here
        const hello = new lambda.Function(this, "Hello Lambda", {
            code: lambda.Code.fromAsset("lambda"),
            handler: "hello.handler",
            runtime: lambda.Runtime.NODEJS_10_X
        })
    
        const api = new apigateway.LambdaRestApi(this, "hello api", {
            handler: hello
        })
    }
}