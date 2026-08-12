# Leila Sinor Ebooks frontend

React, TypeScript, and Vite frontend for the Leila Sinor Ebooks service.

## Local development

```bash
cp .env.example .env
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` in `.env` to the backend URL used during local development.

## Production container

The multi-stage image builds the Vite app and serves it with Nginx. Runtime configuration is generated as `/config.js` when the container starts, which allows the same image to be promoted between environments.

```bash
docker compose up --build -d
curl --fail http://localhost:8080/healthz
```

Set `API_BASE_URL` to override the production API endpoint. This value is public browser configuration, even when AWS Secrets Manager supplies it.

## AWS EC2 deployment

Pushes to `main` run GitHub Actions, build the image, push the commit SHA and `latest` tags to Amazon ECR, then deploy the exact SHA to EC2 through AWS Systems Manager Run Command. No inbound SSH port or SSH key is required. The EC2 instance role retrieves runtime configuration from AWS Secrets Manager before Docker Compose starts the Nginx container.

See [AWS EC2 deployment](docs/aws-ec2-deployment.md) for the one-time AWS, EC2, GitHub OIDC, secret, and repository configuration.

If the EC2 instance already has an Elastic IP and the Route 53 `A` record for
`app.leilasinorebooksapi.online`, follow the dedicated
[EC2 Nginx and SSL guide](docs/ec2-nginx-ssl.md) to connect the domain and issue
an automatically renewed TLS certificate.
