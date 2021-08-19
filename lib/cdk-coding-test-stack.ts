import { Stack, StackProps, Construct } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-ecr';
import { Peer, Port, SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
import { Cluster, ContainerImage, FargateTaskDefinition, Protocol } from '@aws-cdk/aws-ecs';
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';

const repoName = 'coding-test-repository';

export class CdkCodingTestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const ecrRepo = new Repository(this, repoName, {
      repositoryName: repoName
    });

    const vpc = new Vpc(this, 'coding-test-vpc', { maxAzs: 3 });

    const cluster = new Cluster(this, 'coding-test-cluster', {
      clusterName: 'coding-test-cluster',
      vpc
    });

    const executionRole = new Role(this, 'coding-test-execution-role', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      roleName: 'coding-test-execution-role'
    });

    executionRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ]
    }));

    const taskDefinition = new FargateTaskDefinition(this, 'coding-test-task-definition', {
      executionRole,
      family: 'coding-test-task-definition'
    });

    const container = taskDefinition.addContainer('coding-test', {
      image: ContainerImage.fromRegistry('amazon/amazon-ecs-sample')
    });

    container.addPortMappings({ 
      containerPort:5000,
      protocol: Protocol.TCP
     });

    const securityGroup = new SecurityGroup(this, 'coding-test-security-group', {
      vpc,
      securityGroupName: 'coding-test-security-group'
    });

    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(5000), 'allow access to springboot app');

    const service = new ApplicationLoadBalancedFargateService(this, 'coding-test-fargate-service', {
      cluster,
      taskDefinition,
      serviceName: 'coding-test-fargate-service',
      securityGroups: [securityGroup],
      assignPublicIp: true,
      desiredCount: 3,
      listenerPort: 80
    });

    service.taskDefinition.executionRole?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser'));

  }
}
