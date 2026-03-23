import { URL } from "url";
import dns from "dns/promises";

/**
 * Validates if a URL points to an internal or reserved IP address to mitigate SSRF.
 */
export async function validateUrlForSsrf(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    // 1. Basic check for localhost/reserved hostnames
    const reservedHostnames = ["localhost", "127.0.0.1", "::1", "0.0.0.0"];
    if (reservedHostnames.includes(hostname)) return false;

    // 2. Resolve hostname to IP and check against private ranges
    const addresses = await dns.resolve4(hostname).catch(() => []);
    
    for (const ip of addresses) {
      if (isPrivateIp(ip)) return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  
  // 172.16.0.0/12
  if (parts[0] === 172 && (parts[1] >= 16 && parts[1] <= 31)) return true;
  
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  // 169.254.0.0/16 (Link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;
  
  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;

  return false;
}
