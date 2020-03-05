import autoscaling = require('@aws-cdk/aws-autoscaling');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/core');
import elastic = require('@aws-cdk/aws-elasticache');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');

interface RedisClusterProps extends cdk.StackProps{
    vpc: ec2.Vpc
}


class RedisCluster extends cdk.Construct {

    securityGroup: ec2.SecurityGroup;
    connections: ec2.Connections;
    cluster: elastic.CfnCacheCluster;
  
    constructor(scope: cdk.Construct, id: string, props: RedisClusterProps) {
      super(scope, id);
  
      const targetVpc = props.vpc;
  
      // Define a group for telling Elasticache which subnets to put cache nodes in.
      const subnetGroup = new elastic.CfnSubnetGroup(this, `${id}-subnet-group`, {
        description: `List of subnets used for redis cache ${id}`,
        subnetIds: targetVpc.privateSubnets.map(subnet => subnet.subnetId),
        cacheSubnetGroupName: `${id}-subnet-group-name`
      });
  
      // The security group that defines network level access to the cluster
      this.securityGroup = new ec2.SecurityGroup(this, `${id}-security-group`, {vpc: targetVpc});
  
      this.connections = new ec2.Connections({
        securityGroups: [this.securityGroup],
        defaultPort: new ec2.Port({protocol: ec2.Protocol.TCP, stringRepresentation:"redis-port", fromPort: 6379, toPort: 6379})
      });

      // The cluster resource itself.
      this.cluster = new elastic.CfnCacheCluster(this, `${id}-cluster`, {
        // clusterName: `${id}-cluster-cdk`,
        cacheNodeType: 'cache.t2.micro',
        engine: 'redis',
        numCacheNodes: 1,
        autoMinorVersionUpgrade: true,
        cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
        vpcSecurityGroupIds: [
          this.securityGroup.securityGroupId,
        ]
      });
      
      this.cluster.node.addDependency(subnetGroup);
    };
  }



export class EcsStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        
        // const vpc = new ec2.Vpc(this, 'MyVpc', { maxAzs: 2 });
        // // Create an ECS cluster
        // const cluster = new ecs.Cluster(this, 'Cluster', {
        //     vpc,
        // });
        
        // // Add capacity to it
        // cluster.addCapacity('DefaultAutoScalingGroupCapacity', {
        //     instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
        //     desiredCapacity: 3,
        // });
        
        // const taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDef');
        
        // taskDefinition.addContainer('DefaultContainer', {
        //     image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
        //     memoryLimitMiB: 512,
        // });
        
        // // Instantiate an Amazon ECS Service
        // const ecsService = new ecs.Ec2Service(this, 'Service', {
        //     cluster,
        //     taskDefinition,
        // });
        
        
        const vpc = new ec2.Vpc(this, 'MyVpc', { maxAzs: 2 });

        const redisCluster = new RedisCluster(this, "RedisCluster", {vpc})

        const asg = new autoscaling.AutoScalingGroup(this, 'MyFleet', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            machineImage: new ecs.EcsOptimizedAmi(),
            updateType: autoscaling.UpdateType.REPLACING_UPDATE,
            desiredCapacity: 2,
            vpc,
        });
        const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });
        cluster.addAutoScalingGroup(asg);
        // cluster.addCapacity('DefaultAutoScalingGroup', {
        //     instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO)
        // });


        const taskDefinition = new ecs.Ec2TaskDefinition(this, 'WebAppTaskDef');
        
        const webappContainer = taskDefinition.addContainer('webapp', {
          image: ecs.ContainerImage.fromAsset("../cdk-web-app"),
          memoryLimitMiB: 256,
          environment: {
            REDIS_HOST: redisCluster.cluster.attrRedisEndpointAddress,
            REDIS_PORT: redisCluster.cluster.attrRedisEndpointPort,
            USE_REDIS: "true"
          },
          logging: new ecs.AwsLogDriver({ streamPrefix: this.node.id })
        });
        webappContainer.addPortMappings({
            containerPort: 80
        })

        // const redisContainer = taskDefinition.addContainer('redis', {
        //     image: ecs.ContainerImage.fromRegistry("redis:alpine"),
        //     memoryLimitMiB: 256,
        //     logging: new ecs.AwsLogDriver({ streamPrefix: this.node.id })
        //   });
          
        //   redisContainer.addPortMappings({
        //       containerPort: 6379
        //   })

        // Instantiate ECS Service with just cluster and image
        const ecsService = new ecs_patterns.ApplicationLoadBalancedEc2Service(this, "WebAppService", {
            cluster,
            taskDefinition,
            desiredCount: 2
        });
        ecsService.targetGroup.configureHealthCheck({path: "/health"})
        ecsService.service.connections.allowToDefaultPort(redisCluster);

        // Output the DNS where you can access your service
        new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: ecsService.loadBalancer.loadBalancerDnsName });

    }
}