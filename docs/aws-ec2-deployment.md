# Deploy the frontend to AWS EC2 through Systems Manager

This guide deploys this repository exactly as defined in
`.github/workflows/deploy.yml`. It uses AWS Systems Manager Run Command instead
of SSH.

The finished deployment works like this:

1. A push to `main` (or a manual run) starts GitHub Actions.
2. GitHub uses OIDC to obtain temporary AWS credentials. No permanent AWS
   access key is stored in GitHub.
3. The workflow verifies that the target EC2 instance is online in Systems
   Manager.
4. GitHub builds the Docker image and pushes the commit SHA and `latest` tags to
   a private ECR repository.
5. The workflow compresses `compose.yaml` and `scripts/deploy-ec2.sh` into a
   small Systems Manager Run Command payload.
6. SSM Agent receives the command through an outbound connection. No inbound
   SSH port or SSH key is needed.
7. The EC2 instance uses its own IAM role to read `API_BASE_URL` from Secrets
   Manager and pull the exact commit image from ECR.
8. Docker Compose starts Nginx and checks `/healthz`. If a previous release
   exists and the new one is unhealthy, the script restores the previous image.

Allow about 45–90 minutes for the one-time setup. Complete the steps in order.

## 0. Record the deployment values

Choose one AWS Region and use it for EC2, ECR, Secrets Manager, Systems Manager,
and the GitHub variables. This guide uses `us-east-1` only as an example; replace
it everywhere if you choose another Region.

| Setting | Value used in this guide |
| --- | --- |
| GitHub owner | `Leilasinore` |
| GitHub repository | `leila-sinor-ebooks-frontend` |
| GitHub environment | `production` |
| AWS Region | `us-east-1` (example) |
| ECR repository | `leila-sinor-ebooks-frontend` |
| Secrets Manager secret | `leila-sinor-ebooks/frontend/production` |
| EC2 deploy directory | `/opt/leila-sinor-ebooks-frontend` |
| Container architecture | `linux/amd64` for x86 EC2; `linux/arm64` for Graviton |
| Backend URL | `https://www.leilasinorebooksapi.online` |

You will also need:

- your 12-digit AWS account ID;
- the EC2 instance ID, such as `i-0123456789abcdef0`, after step 5.

Before continuing, confirm that:

- you can administer the AWS account and this GitHub repository;
- the backend is reachable over HTTPS;
- the backend CORS configuration permits the final frontend origin;
- all deployment files will be committed before the first workflow run.

## 1. Test the production container locally

From the repository root, run:

```bash
npm ci
npm run lint
npm run build
docker build --platform linux/amd64 -t leila-sinor-ebooks-frontend:test .
docker run --name leila-frontend-test --detach \
  --publish 8088:80 \
  --env API_BASE_URL=https://www.leilasinorebooksapi.online \
  leila-sinor-ebooks-frontend:test
curl --fail http://127.0.0.1:8088/healthz
curl --fail http://127.0.0.1:8088/config.js
docker rm --force leila-frontend-test
```

The first request must return `ok`. The second must show the expected API URL.
Resolve local build errors before creating AWS resources.

Use `linux/arm64` instead if the EC2 instance will use a Graviton/Arm processor.

## 2. Create the private ECR repository

In the AWS console:

1. Select the Region chosen in step 0.
2. Open **Elastic Container Registry (ECR)**.
3. Select **Private repositories** → **Create repository**.
4. Set the repository name to `leila-sinor-ebooks-frontend`.
5. Keep tag mutability **Mutable**, because the workflow updates `latest`.
6. Enable image scanning if it is available for your account.
7. Create the repository.
8. Copy its ARN. It resembles:
   `arn:aws:ecr:us-east-1:123456789012:repository/leila-sinor-ebooks-frontend`.

Do not manually push an image. GitHub Actions performs the first push.

## 3. Create the frontend runtime secret

In the same Region:

1. Open **AWS Secrets Manager** → **Store a new secret**.
2. Choose **Other type of secret**.
3. Use the key `API_BASE_URL` and the value
   `https://www.leilasinorebooksapi.online`.
4. Use the default AWS managed encryption key unless you specifically need a
   customer-managed KMS key.
5. Name the secret `leila-sinor-ebooks/frontend/production`.
6. Finish creating it and copy the secret ARN.

The secret value must be a JSON object:

```json
{
  "API_BASE_URL": "https://www.leilasinorebooksapi.online"
}
```

`API_BASE_URL` is downloaded by every visitor in `/config.js`. It is runtime
configuration, not confidential browser data. Never put database passwords,
AWS credentials, payment-provider secret keys, or other server-only credentials
in this frontend secret.

## 4. Create the EC2 instance role

The server needs permissions for Systems Manager, ECR image pulls, and one
Secrets Manager secret.

### 4.1 Create the application permissions policy

1. Open **IAM** → **Policies** → **Create policy**.
2. Select the **JSON** editor.
3. Paste the policy below.
4. Replace every `REGION` and `ACCOUNT_ID`. Keep the `-*` suffix after the secret
   name because Secrets Manager appends characters to its ARN.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrLogin",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "PullFrontendImage",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Resource": "arn:aws:ecr:REGION:ACCOUNT_ID:repository/leila-sinor-ebooks-frontend"
    },
    {
      "Sid": "ReadFrontendConfig",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:leila-sinor-ebooks/frontend/production-*"
    }
  ]
}
```

5. Name it `LeilaFrontendEc2RuntimePolicy` and create it.

If step 3 used a customer-managed KMS key, add a statement granting
`kms:Decrypt` on that one key.

### 4.2 Create the role

1. Open **IAM** → **Roles** → **Create role**.
2. Select **AWS service** as the trusted entity and **EC2** as the use case.
3. Attach both:
   - `LeilaFrontendEc2RuntimePolicy`;
   - the AWS managed policy `AmazonSSMManagedInstanceCore`.
4. Name the role `LeilaFrontendEc2Role` and create it.

`AmazonSSMManagedInstanceCore` lets SSM Agent register the instance and receive
Run Command and Session Manager traffic. The custom policy remains limited to
this application's ECR repository and secret.

## 5. Launch the EC2 instance without SSH

1. Open **EC2** in the chosen Region and select **Launch instance**.
2. Name it `leila-frontend-production`.
3. Select the official **Ubuntu Server 24.04 LTS** AMI:
   - 64-bit x86 for `linux/amd64`; or
   - 64-bit Arm for `linux/arm64`.
4. Select an instance type with enough memory for Docker and Nginx. A small
   general-purpose instance is normally sufficient for this static frontend;
   monitor it and resize if needed.
5. Under **Key pair**, choose **Proceed without a key pair**. Systems Manager
   replaces SSH for deployment and administration.
6. Under **Network settings**, create a security group with:
   - inbound TCP `80` for the first HTTP verification;
   - no inbound TCP `22` rule;
   - outbound HTTPS (`443`) and the other outbound access required during
     bootstrap to reach Ubuntu, Docker, Snap, AWS CLI, ECR, Secrets Manager, and
     Systems Manager endpoints.
7. Under **Configure storage**, allocate enough disk for the operating system
   and several container images. 16–20 GiB is a practical starting point.
8. Expand **Advanced details** and select the IAM instance profile
   `LeilaFrontendEc2Role`.
9. In **User data**, paste the complete contents of
   `scripts/bootstrap-ec2.sh` from this repository.
10. Launch the instance.
11. Copy its instance ID. This becomes `EC2_INSTANCE_ID` in GitHub.
12. For the initial direct HTTP test, associate an Elastic IP with the instance.
    If an Application Load Balancer will be the only public entry point, the
    instance itself does not need a stable public visitor address.

SSM Agent initiates outbound connections to AWS, so Systems Manager requires no
inbound security-group rule. A public subnet with outbound internet access is
the simplest first setup. A private subnet can instead use NAT or the appropriate
VPC endpoints for Systems Manager, ECR, Secrets Manager, and ECR's S3 image
layers.

## 6. Wait for bootstrap and verify the managed instance

The official Ubuntu AMI normally includes SSM Agent. The user-data bootstrap
starts the agent first, then installs Docker Engine, Compose v2, AWS CLI v2,
`jq`, and `curl`.

In the AWS console:

1. Open **Systems Manager** → **Fleet Manager** → **Managed nodes**.
2. Wait until the new instance appears with connection status **Online**.
3. Alternatively, open **EC2** → **Instances**, select the instance, choose
   **Connect** → **Session Manager** → **Connect**.

In the Session Manager shell, verify bootstrap:

```bash
sudo cloud-init status --wait
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service --no-pager
sudo docker version
sudo docker compose version
aws --version
aws sts get-caller-identity
aws secretsmanager get-secret-value \
  --secret-id leila-sinor-ebooks/frontend/production \
  --region us-east-1 \
  --query SecretString \
  --output text | jq .
```

Expected results:

- cloud-init reports `done`;
- SSM Agent and Docker are running;
- AWS CLI v2 and Docker Compose v2 are installed;
- STS identifies `LeilaFrontendEc2Role`;
- the final command returns the JSON created in step 3.

If bootstrap failed, inspect:

```bash
sudo tail -n 200 /var/log/cloud-init-output.log
```

Do not continue until the instance is **Online** in Systems Manager and these
checks pass.

## 7. Add GitHub as an AWS OIDC provider

This is a one-time action per AWS account. If the provider already exists, do
not create a duplicate.

1. Open **IAM** → **Identity providers** → **Add provider**.
2. Choose **OpenID Connect**.
3. Provider URL: `https://token.actions.githubusercontent.com`.
4. Audience: `sts.amazonaws.com`.
5. Add the provider.

OIDC gives the workflow temporary credentials. Do not create or store an
`AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` for this deployment.

## 8. Create the GitHub Actions deployment role

The GitHub role can push this repository's image and send only the AWS-managed
`AWS-RunShellScript` document to the one EC2 instance.

### 8.1 Create its deployment policy

1. Open **IAM** → **Policies** → **Create policy** → **JSON**.
2. Paste the policy below.
3. Replace `REGION`, `ACCOUNT_ID`, and `INSTANCE_ID`. Use the instance ID copied
   in step 5 without angle brackets.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrLogin",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "PushFrontendImage",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "arn:aws:ecr:REGION:ACCOUNT_ID:repository/leila-sinor-ebooks-frontend"
    },
    {
      "Sid": "RunDeploymentOnOneInstance",
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "arn:aws:ssm:REGION::document/AWS-RunShellScript",
        "arn:aws:ec2:REGION:ACCOUNT_ID:instance/INSTANCE_ID"
      ]
    },
    {
      "Sid": "CheckAndManageDeploymentCommand",
      "Effect": "Allow",
      "Action": [
        "ssm:CancelCommand",
        "ssm:DescribeInstanceInformation",
        "ssm:GetCommandInvocation"
      ],
      "Resource": "*"
    }
  ]
}
```

4. Name it `LeilaFrontendGitHubDeployPolicy` and create it.

`GetCommandInvocation` and `DescribeInstanceInformation` do not support
resource-level restriction, so their statement uses `Resource: "*"`. The
state-changing `SendCommand` permission is restricted to one instance and one
AWS-managed document.

### 8.2 Create the OIDC role

1. Open **IAM** → **Roles** → **Create role**.
2. Choose **Web identity** and select
   `token.actions.githubusercontent.com` with audience `sts.amazonaws.com`.
3. If the console asks for GitHub scope fields, enter organization
   `Leilasinore` and repository `leila-sinor-ebooks-frontend`.
4. Attach `LeilaFrontendGitHubDeployPolicy`.
5. Name the role `LeilaFrontendGitHubDeployRole` and create it.
6. Open the role → **Trust relationships** → **Edit trust policy**.
7. Replace the trust policy with the following, substituting only `ACCOUNT_ID`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Leilasinore/leila-sinor-ebooks-frontend:environment:production"
        }
      }
    }
  ]
}
```

The owner, repository, and environment names are case-sensitive. This exact
subject is required because the workflow job declares `environment: production`.

Copy the role ARN. It resembles
`arn:aws:iam::123456789012:role/LeilaFrontendGitHubDeployRole`.

## 9. Configure the GitHub `production` environment

In GitHub, open this repository and go to **Settings** → **Environments** →
**New environment**. Name it exactly `production`.

Restrict deployment branches to `main`. Add a required reviewer if your GitHub
plan and release process support it.

Add these **environment variables**:

| Name | Value |
| --- | --- |
| `AWS_REGION` | Your chosen Region, for example `us-east-1` |
| `AWS_ROLE_ARN` | ARN of `LeilaFrontendGitHubDeployRole` |
| `ECR_REPOSITORY` | `leila-sinor-ebooks-frontend` |
| `AWS_SECRET_ID` | `leila-sinor-ebooks/frontend/production` |
| `EC2_INSTANCE_ID` | Instance ID, for example `i-0123456789abcdef0` |
| `EC2_DEPLOY_PATH` | `/opt/leila-sinor-ebooks-frontend` |
| `DOCKER_PLATFORM` | `linux/amd64` for x86, or `linux/arm64` for Graviton |

No GitHub environment secrets are required for this deployment.

If this repository was previously configured for SSH deployment, delete these
obsolete GitHub values:

- variables `EC2_HOST` and `EC2_USER`;
- secrets `EC2_SSH_PRIVATE_KEY` and `EC2_KNOWN_HOSTS`.

Also remove inbound TCP 22 from the EC2 security group. The SSM workflow does
not use it.

## 10. Commit and run the first deployment

Review the changes, then commit them through your normal review process:

```bash
git status --short
git add .dockerignore .env.example .github/workflows/deploy.yml \
  Dockerfile compose.yaml docker nginx public/config.js \
  scripts/bootstrap-ec2.sh scripts/deploy-ec2.sh \
  src/api/client.ts src/runtime-config.d.ts index.html README.md \
  docs/aws-ec2-deployment.md
git diff --cached
git commit -m "Deploy the frontend through AWS Systems Manager"
git push origin main
```

Treat the `git add` list as a starting point. Review `git status` and the staged
diff so required deployment changes are included without accidentally committing
unrelated work.

A push to `main` starts **Deploy frontend to EC2 with SSM** automatically.
Alternatively, after the workflow exists on `main`, open **Actions** → **Deploy
frontend to EC2 with SSM** → **Run workflow**.

Watch these workflow stages complete:

1. Validate deployment configuration
2. Configure temporary AWS credentials
3. Verify EC2 is online in Systems Manager
4. Log in to Amazon ECR
5. Build and push image
6. Prepare Systems Manager deployment payload
7. Deploy and verify through Systems Manager

The last step prints the SSM command ID, status updates, and the remote command's
stdout/stderr. Success ends with `Deployment is healthy:` and the commit-tagged
ECR image URI.

## 11. Verify the live deployment

For a direct HTTP test, replace `EC2_ADDRESS` with the Elastic IP or public DNS
name:

```bash
curl --fail --show-error http://EC2_ADDRESS/healthz
curl --fail --show-error http://EC2_ADDRESS/config.js
curl --fail --show-error http://EC2_ADDRESS/ | head
```

Expected results:

- `/healthz` returns `ok`;
- `/config.js` contains the correct `API_BASE_URL`;
- `/` returns the application's HTML.

Open `http://EC2_ADDRESS` in a browser and verify that the page renders, direct
React Router URLs work, and API calls reach the expected backend without CORS or
mixed-content errors.

To inspect the release without SSH, open an EC2 Session Manager connection and
run:

```bash
cd /opt/leila-sinor-ebooks-frontend
sudo docker compose ps
sudo docker compose logs --tail=100 frontend
sudo docker inspect --format '{{.Config.Image}}' \
  "$(sudo docker compose ps -q frontend)"
```

You can also inspect the deployment under **Systems Manager** → **Run Command** →
**Command history**, using the command ID printed by GitHub Actions.

## 12. Put HTTPS in front of the instance before production use

The repository container listens on HTTP port 80. Do not serve login, account,
or checkout traffic to customers over plain HTTP.

A common AWS production setup is:

1. Request an ACM certificate for the frontend domain.
2. Create an Application Load Balancer in public subnets.
3. Create an HTTP target group pointing to EC2 port 80, with health-check path
   `/healthz`.
4. Add an HTTPS 443 listener using the ACM certificate.
5. Redirect the load balancer's HTTP 80 listener to HTTPS 443.
6. Point the domain's DNS record to the load balancer.
7. Change the EC2 security group so port 80 accepts traffic only from the load
   balancer's security group.
8. Keep port 22 closed. Systems Manager still uses outbound port 443.
9. Update backend CORS to allow `https://YOUR_FRONTEND_DOMAIN`.
10. Verify the HTTPS health endpoint, home page, routes, and API calls.

GitHub continues targeting `EC2_INSTANCE_ID`; visitors use the load balancer's
HTTPS domain.

## 13. Routine deployments, configuration, and rollback

- Every push to `main` deploys a new commit-tagged image.
- The workflow updates `latest`, but EC2 deploys the immutable commit SHA in
  `IMAGE_URI`.
- To deploy without another push, use the workflow's **Run workflow** button.
- To change the backend URL, update `API_BASE_URL` in Secrets Manager and rerun
  the workflow. The workflow rebuilds for a consistent release trail, although
  the runtime setting itself does not require a new image.
- If the instance is replaced, update both the IAM policy's instance ARN and the
  GitHub `EC2_INSTANCE_ID` variable.
- Add an ECR lifecycle policy when old images consume excessive storage. Retain
  enough recent images for rollback.

The deployment script automatically restores the previously running image if a
new container fails `/healthz`. The workflow still reports failure so the bad
release remains visible.

To redeploy a previously successful commit, open its historical workflow run in
GitHub Actions and select **Re-run all jobs**. A rerun retains that run's original
commit SHA. Repeat the checks in step 11 afterward.

## Migrating an existing SSH-based instance

If the EC2 instance from the old guide already exists:

1. Attach `AmazonSSMManagedInstanceCore` to `LeilaFrontendEc2Role`.
2. Confirm the instance has outbound HTTPS access to Systems Manager.
3. Wait for it to appear **Online** in Fleet Manager. Official Ubuntu AMIs
   normally already contain SSM Agent.
4. Connect with Session Manager and run the contents of
   `scripts/bootstrap-ec2.sh` with `sudo` if Docker, AWS CLI, `jq`, or `curl` is
   missing.
5. Add the SSM permissions from step 8 to the GitHub deployment role.
6. Replace the GitHub SSH variables and secrets with `EC2_INSTANCE_ID` as shown
   in step 9.
7. Deploy successfully through SSM.
8. Remove the security group's inbound port 22 rule and delete the obsolete SSH
   secrets from GitHub.

Do not close the old access path until the instance shows **Online** and a
Session Manager connection succeeds.

## Troubleshooting

### The workflow says the instance is not online

Check that:

- `EC2_INSTANCE_ID` is correct and is in `AWS_REGION`;
- the instance is running;
- `LeilaFrontendEc2Role` is attached;
- the role has `AmazonSSMManagedInstanceCore`;
- SSM Agent is running;
- the instance can make outbound HTTPS connections to `ssm`, `ssmmessages`, and
  related AWS endpoints.

In the EC2 console, review the instance's system log and
`/var/log/amazon/ssm/amazon-ssm-agent.log` when accessible.

### `AccessDenied` during the Systems Manager preflight

The GitHub role needs `ssm:DescribeInstanceInformation` with `Resource: "*"`.
Confirm `AWS_ROLE_ARN` points to `LeilaFrontendGitHubDeployRole`.

### `AccessDeniedException` from `SendCommand`

Confirm that the GitHub policy contains both resources required by
`ssm:SendCommand`:

- the exact EC2 instance ARN;
- `arn:aws:ssm:REGION::document/AWS-RunShellScript`.

Also verify the Region, account ID, and instance ID in the policy.

### `Not authorized to perform sts:AssumeRoleWithWebIdentity`

Check that:

- `AWS_ROLE_ARN` points to the GitHub OIDC role, not the EC2 role;
- the trust policy uses the exact, case-sensitive repository path;
- its subject ends in `environment:production`;
- the OIDC audience is `sts.amazonaws.com`;
- the workflow declares `permissions: id-token: write` and
  `environment: production`.

### The remote command reports a missing program

Open Session Manager, inspect `/var/log/cloud-init-output.log`, and run the
bootstrap checks in step 6. Rerun `scripts/bootstrap-ec2.sh` as root if the
initial user-data execution did not finish.

### ECR push or pull returns `AccessDenied`

For a push failure, check the ECR permissions on the GitHub role. For a pull
failure in the remote SSM output, check `LeilaFrontendEc2RuntimePolicy` on the
EC2 role. In both cases, verify the repository ARN and Region.

### EC2 cannot read the secret

Run the Secrets Manager test from step 6 in Session Manager. Verify the secret
is in the same Region and the EC2 policy ARN includes the Secrets Manager suffix
wildcard.

### `exec format error`

`DOCKER_PLATFORM` does not match the EC2 CPU architecture. In Session Manager,
run `uname -m`: `x86_64` needs `linux/amd64`; `aarch64` needs `linux/arm64`.

### Port 80 is already allocated

In Session Manager, find the process using it:

```bash
sudo ss -ltnp '( sport = :80 )'
```

Stop or reconfigure that service before rerunning deployment.

### Health check fails

In Session Manager, run:

```bash
cd /opt/leila-sinor-ebooks-frontend
sudo docker compose ps
sudo docker compose logs --tail=200 frontend
curl --verbose http://127.0.0.1/healthz
```

Check that the image was pulled, port 80 is free, and the secret contains a
valid `http://` or `https://` URL.

### The page loads but API requests fail

Inspect `/config.js` and the browser network console. Common causes are an
incorrect `API_BASE_URL`, backend CORS not allowing the frontend origin, an
unreachable backend, or an HTTPS page trying to call an HTTP API.

## Official references

- [AWS: Systems Manager Run Command](https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command.html)
- [AWS: Session Manager requires no inbound ports or SSH keys](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
- [AWS: instance permissions for Systems Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-instance-profile.html)
- [AWS: install and verify SSM Agent on Ubuntu](https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-ubuntu-64-snap.html)
- [AWS: Systems Manager networking and VPC endpoints](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)
- [AWS: GitHub OIDC role configuration](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html)
- [AWS: ECR image-push permissions](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html)
- [Docker: install Docker Engine and Compose on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
