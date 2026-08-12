#!/usr/bin/env bash
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

# Official Ubuntu EC2 AMIs normally include SSM Agent. Install it from the
# AWS-recommended Snap package if it is absent, then make sure it is running.
if ! snap list amazon-ssm-agent >/dev/null 2>&1; then
  snap install amazon-ssm-agent --classic
fi
snap start amazon-ssm-agent

apt-get update
apt-get install -y ca-certificates curl jq unzip

# Install Docker Engine, Buildx, and the Compose v2 plugin from Docker's Ubuntu
# repository. This avoids the legacy docker-compose package.
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

if id ubuntu >/dev/null 2>&1; then
  usermod -aG docker ubuntu
fi

# Install AWS CLI v2 for the instance architecture.
case "$(uname -m)" in
  x86_64)
    aws_cli_url=https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip
    ;;
  aarch64|arm64)
    aws_cli_url=https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip
    ;;
  *)
    echo "Unsupported CPU architecture for AWS CLI v2: $(uname -m)" >&2
    exit 1
    ;;
esac

aws_cli_tmp_dir=$(mktemp -d)
trap 'rm -rf "$aws_cli_tmp_dir"' EXIT
curl -fsSL "$aws_cli_url" -o "$aws_cli_tmp_dir/awscliv2.zip"
unzip -q "$aws_cli_tmp_dir/awscliv2.zip" -d "$aws_cli_tmp_dir"

if command -v aws >/dev/null 2>&1; then
  "$aws_cli_tmp_dir/aws/install" --update
else
  "$aws_cli_tmp_dir/aws/install"
fi

install -d -m 0755 /opt/leila-sinor-ebooks-frontend

docker version
docker compose version
aws --version
snap services amazon-ssm-agent
