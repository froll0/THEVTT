import { createSocket } from 'node:dgram';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findGateway, isPrivateIp, mapPort, unmapPort } from '../src/upnp';

/** A fake home router: SSDP responder + device description + SOAP control endpoint. */
let http: Server;
let ssdp: ReturnType<typeof createSocket>;
let ssdpPort = 0;
const calls: { action: string; body: string }[] = [];
let rejectPermanentLease = true;

beforeAll(async () => {
  http = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (req.url === '/desc.xml') {
        res.setHeader('content-type', 'text/xml');
        res.end(`<?xml version="1.0"?><root><device><deviceList><device><serviceList>
          <service><serviceType>urn:schemas-upnp-org:service:Layer3Forwarding:1</serviceType><controlURL>/l3f</controlURL></service>
          <service><serviceType>urn:schemas-upnp-org:service:WANIPConnection:1</serviceType><controlURL>/ctl/IPConn</controlURL></service>
        </serviceList></device></deviceList></device></root>`);
        return;
      }
      const action = /#(\w+)"/.exec(String(req.headers.soapaction))?.[1] ?? '?';
      calls.push({ action, body });
      if (action === 'AddPortMapping' && rejectPermanentLease && body.includes('<NewLeaseDuration>0<')) {
        res.statusCode = 500;
        res.end('<s:Envelope><s:Body><s:Fault><detail><UPnPError><errorCode>725</errorCode><errorDescription>OnlyPermanentLeasesSupported</errorDescription></UPnPError></detail></s:Fault></s:Body></s:Envelope>');
        return;
      }
      if (action === 'GetExternalIPAddress') {
        res.end('<s:Envelope><s:Body><u:GetExternalIPAddressResponse><NewExternalIPAddress>203.0.113.7</NewExternalIPAddress></u:GetExternalIPAddressResponse></s:Body></s:Envelope>');
        return;
      }
      res.end('<s:Envelope><s:Body/></s:Envelope>');
    });
  });
  await new Promise<void>((r) => http.listen(0, '127.0.0.1', r));
  const httpPort = (http.address() as AddressInfo).port;

  ssdp = createSocket('udp4');
  ssdp.on('message', (msg, rinfo) => {
    if (!msg.toString().startsWith('M-SEARCH')) return;
    const reply = `HTTP/1.1 200 OK\r\nST: urn:schemas-upnp-org:device:InternetGatewayDevice:1\r\nLOCATION: http://127.0.0.1:${httpPort}/desc.xml\r\n\r\n`;
    ssdp.send(reply, rinfo.port, rinfo.address);
  });
  await new Promise<void>((r) => ssdp.bind(0, '127.0.0.1', () => r()));
  ssdpPort = ssdp.address().port;
});

afterAll(() => {
  http.close();
  ssdp.close();
});

describe('upnp', () => {
  it('discovers the gateway, maps a port with a timed lease fallback and unmaps it', async () => {
    const gw = await findGateway({ ssdpAddress: '127.0.0.1', ssdpPort, timeoutMs: 400 });
    expect(gw).toMatchObject({ serviceType: 'urn:schemas-upnp-org:service:WANIPConnection:1', localAddress: '127.0.0.1' });
    expect(gw!.controlUrl).toMatch(/\/ctl\/IPConn$/);

    const mapping = await mapPort(gw!, 4477);
    expect(mapping).toMatchObject({ externalPort: 4477, externalIp: '203.0.113.7', leaseSeconds: 7200 });
    const adds = calls.filter((c) => c.action === 'AddPortMapping');
    expect(adds).toHaveLength(2);
    expect(adds[1]!.body).toContain('<NewInternalClient>127.0.0.1</NewInternalClient>');

    await unmapPort(mapping);
    expect(calls.at(-1)!.action).toBe('DeletePortMapping');
  });

  it('returns null when nobody answers', async () => {
    expect(await findGateway({ ssdpAddress: '127.0.0.1', ssdpPort: 9, timeoutMs: 200 })).toBeNull();
  });

  it('recognises addresses unreachable from the internet', () => {
    expect(isPrivateIp('192.168.1.4')).toBe(true);
    expect(isPrivateIp('100.72.1.1')).toBe(true); // CGNAT
    expect(isPrivateIp('203.0.113.7')).toBe(false);
  });
});
