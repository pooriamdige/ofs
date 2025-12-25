import paramiko
import sys
import time

hostname = "185.8.173.37"
username = "root"
password = "P@@ria1381"

def run_command(client, command, description):
    print(f"\n[+] {description}...")
    stdin, stdout, stderr = client.exec_command(command)
    
    # Wait for command to complete and stream output
    exit_status = stdout.channel.recv_exit_status()
    
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    
    if exit_status == 0:
        print(f"✅ Success")
        # print(out) # Optional: print output if needed
    else:
        print(f"❌ Failed")
        print(f"Error: {err}")
        print(f"Output: {out}")
        return False
    return True

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {hostname}...")
    client.connect(hostname, username=username, password=password)
    print("Connected!")

    # 1. Update System
    if not run_command(client, "export DEBIAN_FRONTEND=noninteractive && apt-get update", "Updating package lists"): sys.exit(1)
    # We skip full upgrade to avoid interactive prompts or long waits, but usually good practice. 
    # Let's install essential tools first.
    
    # 2. Install Essentials
    if not run_command(client, "export DEBIAN_FRONTEND=noninteractive && apt-get install -y curl git build-essential ufw", "Installing essential tools"): sys.exit(1)

    # 3. Install Node.js 20
    run_command(client, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", "Setting up Node.js 20 repository")
    if not run_command(client, "export DEBIAN_FRONTEND=noninteractive && apt-get install -y nodejs", "Installing Node.js"): sys.exit(1)
    
    # 4. Install Redis
    if not run_command(client, "export DEBIAN_FRONTEND=noninteractive && apt-get install -y redis-server", "Installing Redis"): sys.exit(1)
    
    # 5. Install Nginx
    if not run_command(client, "export DEBIAN_FRONTEND=noninteractive && apt-get install -y nginx", "Installing Nginx"): sys.exit(1)

    # 6. Install PM2
    if not run_command(client, "npm install -g pm2", "Installing PM2 process manager"): sys.exit(1)

    # 7. Configure Firewall
    print("\n[+] Configuring Firewall...")
    # We need to be careful not to lock ourselves out. SSH is usually allowed by default or we must allow it explicitly.
    run_command(client, "ufw allow 22/tcp", "Allowing SSH")
    run_command(client, "ufw allow 80/tcp", "Allowing HTTP")
    run_command(client, "ufw allow 443/tcp", "Allowing HTTPS")
    # Enable UFW non-interactively
    run_command(client, "ufw --force enable", "Enabling Firewall")

    # 8. Create Project Directory
    if not run_command(client, "mkdir -p /var/www/analysis-dashboard", "Creating project directory"): sys.exit(1)
    
    # 9. Verify Installations
    print("\n[+] Verifying Installations...")
    commands = [
        "node -v",
        "npm -v",
        "pm2 -v",
        "nginx -v",
        "redis-server -v",
        "ufw status"
    ]
    
    for cmd in commands:
        stdin, stdout, stderr = client.exec_command(cmd)
        print(f"{cmd}: {stdout.read().decode('utf-8').strip()} {stderr.read().decode('utf-8').strip()}")

    client.close()
    print("\nServer configuration completed successfully!")

except Exception as e:
    print(f"\n❌ Execution failed: {e}")
    sys.exit(1)
