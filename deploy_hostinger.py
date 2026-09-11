import os
import sys
import re
import posixpath
import paramiko

LOCAL_ROOT = r"c:\software\prashant\personal\progym\webapp\dist"
REMOTE_ROOT = "domains/tavrostechinfo.com/public_html/progym"

HOST = "45.130.228.206"
PORT = 65002
USER = "u636480992"
PWD = os.environ.get("HOSTINGER_PW", "")

if not PWD:
    print("HOSTINGER_PW env var not set", file=sys.stderr)
    sys.exit(1)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PWD, timeout=30)
sftp = c.open_sftp()


def rexists(path):
    try:
        sftp.stat(path)
        return True
    except IOError:
        return False


def rmkdir(path):
    if rexists(path):
        return
    parent = posixpath.dirname(path)
    if parent and not rexists(parent):
        rmkdir(parent)
    sftp.mkdir(path)


uploaded = 0
for dirpath, dirnames, filenames in os.walk(LOCAL_ROOT):
    rel_dir = os.path.relpath(dirpath, LOCAL_ROOT).replace(os.sep, "/")
    remote_dir = REMOTE_ROOT if rel_dir == "." else posixpath.join(REMOTE_ROOT, rel_dir)
    rmkdir(remote_dir)
    for fn in filenames:
        local_fp = os.path.join(dirpath, fn)
        remote_fp = posixpath.join(remote_dir, fn)
        sftp.put(local_fp, remote_fp)
        uploaded += 1
        rel = posixpath.join(rel_dir, fn) if rel_dir != "." else fn
        print(f"  ok {rel}")

print(f"\nUploaded: {uploaded} file(s)")

with sftp.open(posixpath.join(REMOTE_ROOT, "index.html")) as f:
    data = f.read().decode()
refs = re.findall(r"/progym/assets/[A-Za-z0-9\-_.]+", data)
print("Live bundle refs:", refs)

sftp.close()
c.close()
