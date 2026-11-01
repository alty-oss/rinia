/** Yjs messages are binary and the realtime socket speaks JSON, so they travel as base64. */
export function toBase64(bytes: Uint8Array): string {
    let binary = "";
    // Chunked, because spreading a large array into `fromCharCode` overflows the call stack.
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
}

export function fromBase64(data: string): Uint8Array {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
}
