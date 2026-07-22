// Small cookie helpers used to persist the selected language (matches v1 behaviour).

export function setCookie(name: string, value: string, days = 365): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

export function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const parts = document.cookie.split(';');
  for (let part of parts) {
    while (part.charAt(0) === ' ') part = part.substring(1);
    if (part.indexOf(nameEQ) === 0) return part.substring(nameEQ.length);
  }
  return null;
}
