#!/usr/bin/env bash
# Build script for Render. Clones mr.holmes, generates default config,
# copies our wrapper in, installs everything.
set -e

echo ">>> apt deps"
apt-get update -y || true
apt-get install -y whois wkhtmltopdf inetutils-traceroute || true

echo ">>> cloning lucksi/mr.holmes"
rm -rf mr.holmes
git clone --depth 1 https://github.com/lucksi/Mr.Holmes mr.holmes

echo ">>> generating default config (AutoInstaller equivalent)"
cd mr.holmes
mkdir -p Configuration GUI/Credentials GUI/Theme GUI/Language Display Temp/Phone "GUI/Reports/Phone/Dorks"

cat > Configuration/Configuration.ini <<'EOF'
;auto-generated
[Smtp]
status = Disabled
email = None
password = None
destination = None
server = None
port = None

[Settings]
password = Holmes
api_key = None
proxy_list = Proxies/Proxy_list.txt
useragent_list = Useragents/Useragent.txt
show_logs = False
database = False
language = english
date_format = eu
path = .
EOF

echo '{"Database":{"Status":"Deactive"}}' > GUI/Credentials/Login.json
echo '{"Users":[{"Username":"","Password":""}]}' > GUI/Credentials/Users.json
echo '{"Color":{"Background":"Light"}}'        > GUI/Theme/Mode.json
echo '{"Language":{"Preference":"Browser"}}'   > GUI/Language/Language.json
echo "Desktop" > Display/Display.txt

cd ..
echo ">>> copying wrapper into mr.holmes/"
cp app.py mr.holmes/

echo ">>> pip install"
pip install --upgrade pip
pip install -r requirements.txt

echo ">>> done"
