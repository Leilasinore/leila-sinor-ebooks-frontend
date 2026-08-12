# Route `app.leilasinorebooksapi.online` through EC2 Nginx with SSL

This guide uses the Elastic IP directly, without an Application Load Balancer.
It assumes the frontend Docker image from this repository runs on an Ubuntu EC2
instance.

The final request path is:

```text
Browser
  -> Route 53: app.leilasinorebooksapi.online = EC2 Elastic IP
  -> EC2 security group: TCP 80 and 443
  -> host Nginx: TLS termination and HTTP-to-HTTPS redirect
  -> 127.0.0.1:8080
  -> Nginx in the Docker container: React static files and SPA routing
```

The two Nginx processes have different jobs. The Nginx image in `Dockerfile`
serves the built React application over container port 80. Nginx installed on
the EC2 host accepts public traffic, owns the certificate, and reverse-proxies
to the container. The Compose configuration publishes the container only as
`127.0.0.1:8080`, so visitors cannot bypass HTTPS by reaching the container
directly.

## 1. Confirm the Elastic IP and public DNS record

In **EC2** -> **Elastic IP addresses**, confirm that the Elastic IP is associated
with the correct instance and network interface.

In the Route 53 **public hosted zone** for `leilasinorebooksapi.online`, confirm
this record:

| Field | Value |
| --- | --- |
| Record name | `app` |
| Record type | `A` |
| Value | the EC2 Elastic IPv4 address |
| Routing policy | Simple |
| TTL | `300` is suitable |

Do not create an `AAAA` record unless the instance and Nginx are deliberately
configured for public IPv6. A stale or incorrect `AAAA` record can send some
visitors and certificate validation requests to the wrong server.

From your computer, verify DNS. Replace `ELASTIC_IP` with the actual address:

```bash
dig +short A app.leilasinorebooksapi.online
dig +short AAAA app.leilasinorebooksapi.online
```

The first command must print `ELASTIC_IP`. The second should print nothing when
you are using only the Elastic IPv4 address. If the `A` result is still wrong,
wait for DNS caches to expire before requesting a certificate.

## 2. Allow HTTP and HTTPS in the EC2 security group

Open **EC2** -> **Instances**, select the instance, open its **Security** tab,
and edit the attached security group's inbound rules. Add:

| Type | Protocol | Port | Source |
| --- | --- | --- | --- |
| HTTP | TCP | 80 | `0.0.0.0/0` |
| HTTPS | TCP | 443 | `0.0.0.0/0` |

Add equivalent `::/0` rules only if public IPv6 is configured. Port 80 remains
open so Let's Encrypt can perform HTTP validation and so Nginx can redirect HTTP
requests to HTTPS. Do not expose port 8080 in the security group. With the
repository's loopback binding it is unreachable externally even if a rule is
added, but the rule would still be misleading.

SSH port 22 is not required when the instance is managed through AWS Systems
Manager Session Manager, as described in the main deployment guide.

## 3. Deploy the container on loopback port 8080

Deploy the current repository using the GitHub Actions/Systems Manager workflow
in [the main EC2 guide](aws-ec2-deployment.md), or update an existing checkout
and run its normal Docker Compose deployment.

This repository's `compose.yaml` publishes container port 80 to
`127.0.0.1:8080`. On the EC2 instance, connect with Session Manager and verify:

```bash
cd /opt/leila-sinor-ebooks-frontend
sudo docker compose ps
curl --fail http://127.0.0.1:8080/healthz
sudo ss -ltnp '( sport = :8080 )'
```

The health request must return `ok`. The listening address must be
`127.0.0.1:8080`, not `0.0.0.0:8080`.

If an older release still publishes Docker on port 80, deploy this version
before starting host Nginx. Confirm which process owns each port with:

```bash
sudo ss -ltnp '( sport = :80 or sport = :443 or sport = :8080 )'
```

## 4. Install Nginx on the EC2 host

New instances bootstrapped with `scripts/bootstrap-ec2.sh` already have Nginx.
On an existing Ubuntu instance, install and start it:

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl enable --now nginx
sudo systemctl status nginx --no-pager
```

If Nginx cannot start because port 80 is in use, return to step 3 and make sure
the container is bound to port 8080 rather than host port 80.

## 5. Install the subdomain's Nginx configuration

The deployment workflow copies the version-controlled host configuration to
`/opt/leila-sinor-ebooks-frontend/deploy/nginx/`. Install it as an enabled Nginx
site:

```bash
sudo install -m 0644 \
  /opt/leila-sinor-ebooks-frontend/deploy/nginx/app.leilasinorebooksapi.online.conf \
  /etc/nginx/sites-available/app.leilasinorebooksapi.online.conf
sudo ln -sfn \
  /etc/nginx/sites-available/app.leilasinorebooksapi.online.conf \
  /etc/nginx/sites-enabled/app.leilasinorebooksapi.online.conf
sudo nginx -t
sudo systemctl reload nginx
```

Test the virtual host locally, independently of DNS:

```bash
curl --fail --header 'Host: app.leilasinorebooksapi.online' \
  http://127.0.0.1/healthz
```

Then test it through the public domain:

```bash
curl --fail http://app.leilasinorebooksapi.online/healthz
```

Both commands must return `ok` before continuing. Certbot's Nginx flow expects
the HTTP site to be reachable from the internet on port 80.

## 6. Install Certbot and issue the certificate

Install the official Certbot snap and make its command available:

```bash
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot
certbot --version
```

Ask Certbot to obtain a certificate, update this Nginx server block, and enable
the HTTP-to-HTTPS redirect:

```bash
sudo certbot --nginx \
  -d app.leilasinorebooksapi.online \
  --redirect
```

Enter a monitored email address, accept the subscriber agreement, and make the
email-sharing choice when prompted. Request only this subdomain unless another
hostname has its own valid DNS record pointing to this same server.

Certbot writes the certificate under `/etc/letsencrypt`, adds the TLS settings
to the enabled Nginx site, checks the configuration, and reloads Nginx. Do not
copy the certificate into the Docker image; baking a short-lived private key
into an image makes renewal and secret handling harder.

## 7. Verify HTTPS and the redirect

Run:

```bash
curl --head http://app.leilasinorebooksapi.online
curl --fail --show-error https://app.leilasinorebooksapi.online/healthz
curl --fail --show-error https://app.leilasinorebooksapi.online/config.js
sudo nginx -t
sudo certbot certificates
```

Expected results:

- HTTP returns a `301` or `308` redirect to the same URL on HTTPS.
- The HTTPS health endpoint returns `ok` with a valid certificate.
- `/config.js` shows the expected public backend `API_BASE_URL`.
- `nginx -t` succeeds and Certbot lists
  `app.leilasinorebooksapi.online` as a covered domain.

Open `https://app.leilasinorebooksapi.online` in a browser and test a direct
React Router URL as well as API calls. The backend must allow the frontend
origin `https://app.leilasinorebooksapi.online` in its CORS configuration. The
backend URL must also use HTTPS, otherwise browsers will block its requests as
mixed content.

## 8. Test automatic certificate renewal

The Certbot snap installs automated renewal. Confirm the timer and perform the
official dry-run test:

```bash
systemctl list-timers --all | grep certbot
sudo certbot renew --dry-run
```

Keep both inbound ports 80 and 443 open. Check certificate renewal periodically
and monitor Nginx errors rather than waiting for a browser certificate warning.

## Troubleshooting

### Certbot reports an authorization or challenge failure

Check all of the following before retrying:

```bash
dig +short A app.leilasinorebooksapi.online
curl --verbose http://app.leilasinorebooksapi.online/healthz
sudo nginx -t
sudo journalctl -u nginx --no-pager -n 100
```

The `A` record must resolve to this instance's Elastic IP, TCP 80 must be open,
and the host Nginx configuration must load successfully. Also remove an
incorrect `AAAA` record. Avoid repeated issuance attempts until these checks
pass because certificate authorities apply rate limits.

### Nginx returns `502 Bad Gateway`

Host Nginx cannot reach the container. Check:

```bash
curl --verbose http://127.0.0.1:8080/healthz
cd /opt/leila-sinor-ebooks-frontend
sudo docker compose ps
sudo docker compose logs --tail=100 frontend
```

The container must be healthy and published on `127.0.0.1:8080`.

### The Nginx welcome page appears

Confirm that the request uses the exact subdomain and that the site is enabled:

```bash
sudo nginx -T | grep -n 'server_name app.leilasinorebooksapi.online'
curl --header 'Host: app.leilasinorebooksapi.online' http://127.0.0.1/healthz
```

The default site may remain enabled because the exact `server_name` takes
precedence for this domain.

### HTTPS works but API calls fail

Inspect the browser's network console and:

```bash
curl --fail https://app.leilasinorebooksapi.online/config.js
```

Correct the frontend `API_BASE_URL` in Secrets Manager if necessary and rerun
the deployment. Separately configure the API's CORS allowlist to include the
exact HTTPS frontend origin.

## Official references

- [AWS: routing Route 53 traffic to an EC2 instance](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-ec2-instance.html)
- [AWS: security-group rules for HTTP and HTTPS web servers](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html)
- [Nginx: reverse proxy configuration](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Certbot: Nginx on Linux installation and renewal](https://certbot.eff.org/instructions?ws=nginx&os=snap)
- [Let's Encrypt: why port 80 should remain open](https://letsencrypt.org/docs/allow-port-80/)
