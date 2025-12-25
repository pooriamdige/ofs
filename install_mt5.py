import paramiko
import sys
import time

hostname = "185.8.173.37"
username = "root"
password = "P@@ria1381"

def run_command(client, command, description):
    print(f"\n[+] {description}...")
    stdin, stdout, stderr = client.exec_command(command)
    
    # Wait for command to complete
    exit_status = stdout.channel.recv_exit_status()
    
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    
    if exit_status == 0:
        print(f"✅ Success")
        return True
    else:
        print(f"❌ Failed")
        print(f"Error: {err}")
        print(f"Output: {out}")
        return False

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {hostname}...")
    client.connect(hostname, username=username, password=password)
    print("Connected!")

    # 1. Install Docker
    # Check if docker is installed
    stdin, stdout, stderr = client.exec_command("docker -v")
    if stdout.channel.recv_exit_status() != 0:
        print("Docker not found. Installing...")
        run_command(client, "export DEBIAN_FRONTEND=noninteractive && apt-get update", "Updating apt")
        run_command(client, "export DEBIAN_FRONTEND=noninteractive && apt-get install -y docker.io", "Installing Docker")
        run_command(client, "systemctl start docker", "Starting Docker")
        run_command(client, "systemctl enable docker", "Enabling Docker startup")
    else:
        print("Docker is already installed.")

    # 2. Deploy MT5 API Container
    # Stop/Remove existing if any
    run_command(client, "docker stop mt5rest || true", "Stopping existing container")
    run_command(client, "docker rm mt5rest || true", "Removing existing container")
    
    # Run new container
    # Using mtapiio/mt5rest as per 'Installation with Docker' section
    # If this fails, we might need to fallback to timurila/mt5rest
    print("\n[+] Pulling and running MT5 API container...")
    stdin, stdout, stderr = client.exec_command("docker run -d --restart always --name mt5rest -p 5000:80 mtapiio/mt5rest")
    exit_status = stdout.channel.recv_exit_status()
    
    if exit_status != 0:
        err_msg = stderr.read().decode('utf-8')
        print(f"Failed to run mtapiio/mt5rest: {err_msg}")
        print("Trying fallback image: timurila/mt5rest...")
        stdin, stdout, stderr = client.exec_command("docker run -d --restart always --name mt5rest -p 5000:80 timurila/mt5rest")
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            print(f"❌ Failed to run fallback image too: {stderr.read().decode('utf-8')}")
            sys.exit(1)
        else:
             print("✅ Success (using fallback image)")
    else:
        print("✅ Success")

    # 3. Configure Firewall
    run_command(client, "ufw allow 5000/tcp", "Allowing Port 5000")
    run_command(client, "ufw reload", "Reloading Firewall")

    # 4. Verify
    print("\n[+] Verifying MT5 API...")
    # Give it a moment to start
    time.sleep(5)
    stdin, stdout, stderr = client.exec_command("curl -I http://localhost:5000")
    print(f"Local Check: {stdout.read().decode('utf-8')}")
    
    stdin, stdout, stderr = client.exec_command("docker ps | grep mt5rest")
    print(f"Container Status: {stdout.read().decode('utf-8')}")

    client.close()
    print("\nMT5 API installation completed!")

except Exception as e:
    print(f"\n❌ Execution failed: {e}")
    sys.exit(1)
