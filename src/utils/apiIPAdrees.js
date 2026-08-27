// Switch between local PC and Railway for dev testing:
// Local, physical device on the same WiFi as this machine: 'http://10.129.39.155:5050/api'
//   (this machine's current Wi-Fi IP — re-check with `ipconfig` if it ever
//   changes, e.g. after reconnecting to WiFi; DHCP can hand out a new one.
//   Port 5050, not 5000 — 5000 is already taken locally by the JobMatch
//   backend, a separate app/repo also running on this machine.)
// Local, Android emulator (AVD):    'http://10.0.2.2:5050/api'      (special host alias, not a real IP)
// Local, iOS simulator:             'http://localhost:5050/api'    (simulator shares the host's networking)
// Railway (real device, no local server): 'https://heartlinkappbackend-production.up.railway.app/api'
export const ApiIPAddress = 'http://10.129.39.155:5050/api';
