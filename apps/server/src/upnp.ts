import { createSocket } from 'node:dgram';

/**
 * Minimal UPnP Internet Gateway Device client: asks the home router to forward
 * a TCP port to this computer, so friends can reach the hosted server from the
 * internet without touching router settings.
 */

export interface UpnpOptions {
  /** SSDP target, overridable for tests */
  ssdpAddress?: string;
  ssdpPort?: number;
  timeoutMs?: number;
}

export interface Gateway {
  controlUrl: string;
  serviceType: string;
  /** our address on the LAN, as seen towards the gateway */
  localAddress: string;
}

export interface PortMapping {
  gateway: Gateway;
  externalPort: number;
  externalIp: string | null;
  leaseSeconds: number;
}

const SEARCH_TARGETS = [
  'urn:schemas-upnp-org:device:InternetGatewayDevice:1',
  'urn:schemas-upnp-org:device:InternetGatewayDevice:2',
  'urn:schemas-upnp-org:service:WANIPConnection:1',
  'urn:schemas-upnp-org:service:WANIPConnection:2',
  'urn:schemas-upnp-org:service:WANPPPConnection:1',
];

/** Sends SSDP M-SEARCH and returns the description URLs of the gateways that answered. */
export function discoverLocations(opts: UpnpOptions = {}): Promise<string[]> {
  const address = opts.ssdpAddress ?? '239.255.255.250';
  const port = opts.ssdpPort ?? 1900;
  const timeout = opts.timeoutMs ?? 2500;
  return new Promise((resolve) => {
    const found = new Set<string>();
    const socket = createSocket({ type: 'udp4', reuseAddr: true });
    const finish = () => {
      try {
        socket.close();
      } catch {
        /* already closed */
      }
      resolve([...found]);
    };
    socket.on('error', finish);
    socket.on('message', (msg) => {
      const location = /^location:\s*(.+)$/im.exec(msg.toString())?.[1]?.trim();
      if (location) found.add(location);
    });
    socket.bind(0, () => {
      for (const st of SEARCH_TARGETS) {
        const req = `M-SEARCH * HTTP/1.1\r\nHOST: ${address}:${port}\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: ${st}\r\n\r\n`;
        socket.send(req, port, address);
      }
      setTimeout(finish, timeout);
    });
  });
}

const tag = (xml: string, name: string) => new RegExp(`<(?:\\w+:)?${name}>\\s*([^<]*?)\\s*</(?:\\w+:)?${name}>`, 'i').exec(xml)?.[1];

/** Reads a gateway description and finds its WAN connection service. */
export async function describeGateway(location: string, timeoutMs = 3000): Promise<Omit<Gateway, 'localAddress'> | null> {
  const res = await fetch(location, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) return null;
  const xml = await res.text();
  const base = tag(xml, 'URLBase') || location;
  for (const block of xml.match(/<service>[\s\S]*?<\/service>/gi) ?? []) {
    const serviceType = tag(block, 'serviceType');
    const controlUrl = tag(block, 'controlURL');
    if (serviceType && controlUrl && /WAN(IP|PPP)Connection/.test(serviceType)) {
      return { serviceType, controlUrl: new URL(controlUrl, base).toString() };
    }
  }
  return null;
}

/** The local IP the OS would use to reach a host (no packets are sent). */
export function localAddressTowards(host: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = createSocket('udp4');
    s.on('error', reject);
    s.connect(9, host, () => {
      const { address } = s.address();
      s.close();
      resolve(address);
    });
  });
}

async function soap(gw: Gateway, action: string, args: Record<string, string | number>, timeoutMs = 4000): Promise<string> {
  const body =
    `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">` +
    `<s:Body><u:${action} xmlns:u="${gw.serviceType}">` +
    Object.entries(args)
      .map(([k, v]) => `<${k}>${v}</${k}>`)
      .join('') +
    `</u:${action}></s:Body></s:Envelope>`;
  const res = await fetch(gw.controlUrl, {
    method: 'POST',
    headers: { 'content-type': 'text/xml; charset="utf-8"', soapaction: `"${gw.serviceType}#${action}"` },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    const code = tag(text, 'errorCode');
    const desc = tag(text, 'errorDescription');
    throw new Error(`UPnP ${action} rifiutato${code ? ` (${code}${desc ? ` ${desc}` : ''})` : ` (HTTP ${res.status})`}`);
  }
  return text;
}

export async function findGateway(opts: UpnpOptions = {}): Promise<Gateway | null> {
  for (const location of await discoverLocations(opts)) {
    try {
      const gw = await describeGateway(location, opts.timeoutMs);
      if (gw) return { ...gw, localAddress: await localAddressTowards(new URL(location).hostname) };
    } catch {
      /* try the next one */
    }
  }
  return null;
}

export async function externalIp(gw: Gateway): Promise<string | null> {
  try {
    return tag(await soap(gw, 'GetExternalIPAddress', {}), 'NewExternalIPAddress') || null;
  } catch {
    return null;
  }
}

/**
 * Maps externalPort → localAddress:internalPort (TCP). Tries a permanent lease
 * first; some routers only accept timed leases, which the caller must renew.
 */
export async function mapPort(gw: Gateway, internalPort: number, externalPort = internalPort, description = 'TheVTT'): Promise<PortMapping> {
  let lastError: unknown;
  for (const lease of [0, 7200]) {
    try {
      await soap(gw, 'AddPortMapping', {
        NewRemoteHost: '',
        NewExternalPort: externalPort,
        NewProtocol: 'TCP',
        NewInternalPort: internalPort,
        NewInternalClient: gw.localAddress,
        NewEnabled: 1,
        NewPortMappingDescription: description,
        NewLeaseDuration: lease,
      });
      return { gateway: gw, externalPort, externalIp: await externalIp(gw), leaseSeconds: lease };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Mappatura della porta non riuscita');
}

export async function unmapPort(m: PortMapping): Promise<void> {
  await soap(m.gateway, 'DeletePortMapping', { NewRemoteHost: '', NewExternalPort: m.externalPort, NewProtocol: 'TCP' }).catch(() => undefined);
}

/** Addresses that are not reachable from the internet (private, CGNAT, link-local). */
export function isPrivateIp(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return false;
  const [a, b] = p as [number, number, number, number];
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254);
}
