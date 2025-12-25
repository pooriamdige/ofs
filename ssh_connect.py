import paramiko
import sys

hostname = "185.8.173.37"
username = "root"
password = "P@@ria1381"

try:
    client = paramiko.SSHClient()
    # Automatically add the server's host key (for automation purposes)
    # In production, you should verify the host key.
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {hostname} as {username}...")
    client.connect(hostname, username=username, password=password)
    print("Connected successfully!")
    
    commands = [
        "uname -a",
        "ls -la",
        "df -h"
    ]
    
    for cmd in commands:
        print(f"\n--- Output of '{cmd}' ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        # Read output and error
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        if output:
            print(output.strip())
        if error:
            print(f"STDERR: {error.strip()}")
            
    client.close()
    print("\nConnection closed.")

except Exception as e:
    print(f"Failed to connect: {e}")
    sys.exit(1)
