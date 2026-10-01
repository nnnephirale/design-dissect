#!/bin/bash
# design-feedback: register the MCP with Claude Code, Codex and Gemini.
#   bash install.sh [--at-login] [library path ...]   (searched in order, then ~/design-systems)
# The comment service itself starts on demand from each folder's "STARTTHIS.command";
# --at-login also runs it at every login instead. Safe to re-run. Undo: remove "design-feedback"
# from ~/.claude.json, ~/.codex/config.toml and ~/.gemini/settings.json (and, if used,
# launchctl bootout gui/$(id -u)/com.design-dissect.feedback).
set -e
DIR="$(cd "$(dirname "$0")" && pwd -P)"
NODE="$(command -v node || true)"
[ -z "$NODE" ] && for n in /usr/local/bin/node /opt/homebrew/bin/node; do [ -x "$n" ] && NODE="$n" && break; done
[ -z "$NODE" ] && { echo "Node.js is needed: install it from https://nodejs.org, then run this again."; exit 1; }
AT_LOGIN=; [ "$1" = "--at-login" ] && AT_LOGIN=1 && shift
LIB="$(IFS=:; echo "$*")"
LABEL=com.design-dissect.feedback
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ -n "$AT_LOGIN" ]; then
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key><string>$LABEL</string>
	<key>ProgramArguments</key><array><string>$NODE</string><string>$DIR/server.mjs</string></array>
	<key>WorkingDirectory</key><string>$DIR</string>
	<key>EnvironmentVariables</key><dict><key>DESIGN_LIBRARY</key><string>$LIB</string></dict>
	<key>RunAtLoad</key><true/>
	<key>KeepAlive</key><true/>
	<key>ThrottleInterval</key><integer>30</integer>
	<key>StandardOutPath</key><string>/tmp/design-feedback.log</string>
	<key>StandardErrorPath</key><string>/tmp/design-feedback.log</string>
</dict>
</plist>
PL
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
fi

# Register the MCP (stdio) with Claude Code, Codex and Gemini.
"$NODE" - "$NODE" "$DIR/mcp.mjs" "$LIB" <<'JS'
const fs = require('fs'), os = require('os'), path = require('path');
const [node, mcp, lib] = process.argv.slice(2), home = os.homedir(), env = { DESIGN_LIBRARY: lib || '' };
const json = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };
for (const file of [path.join(home, '.claude.json'), path.join(home, '.gemini', 'settings.json')]) {
  if (!fs.existsSync(path.dirname(file))) continue;
  const d = json(file);
  d.mcpServers = { ...(d.mcpServers || {}), 'design-feedback': file.endsWith('.claude.json') ? { type: 'stdio', command: node, args: [mcp], env } : { command: node, args: [mcp], env } };
  fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
  console.log('registered in', file);
}
const toml = path.join(home, '.codex', 'config.toml');
if (fs.existsSync(path.dirname(toml))) {
  let t = fs.existsSync(toml) ? fs.readFileSync(toml, 'utf8') : '';
  t = t.replace(/\n?\[mcp_servers\.design-feedback(?:\.env)?\]\n(?:(?!\[)[^\n]*\n?)*/g, '\n');
  t = t.replace(/\s*$/, '\n') + `\n[mcp_servers.design-feedback]\ncommand = ${JSON.stringify(node)}\nargs = [${JSON.stringify(mcp)}]\nenv = { DESIGN_LIBRARY = ${JSON.stringify(env.DESIGN_LIBRARY)} }\n`;
  fs.writeFileSync(toml, t);
  console.log('registered in', toml);
}
JS
echo "Done. Restart your agents to load the design-feedback MCP."
