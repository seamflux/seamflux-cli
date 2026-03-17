import { p256 } from '@noble/curves/nist.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * 将 hex 格式的 EC 公钥转换为 DER 格式 (ASN.1)
 * 
 * P-256 公钥 DER 格式:
 * SubjectPublicKeyInfo ::= SEQUENCE {
 *   algorithm AlgorithmIdentifier,
 *   subjectPublicKey BIT STRING
 * }
 */
function publicKeyHexToDER(publicKeyHex: string): Uint8Array {
  // 确保公钥有 0x04 未压缩前缀
  let publicKeyBytes = hexToBytes(publicKeyHex);
  
  // 如果是压缩格式 (02 或 03)，需要解压缩
  if (publicKeyBytes.length === 33) {
    // 使用 p256 的扩展点运算来解压缩
    const x = publicKeyBytes.slice(1);
    const yIsOdd = publicKeyBytes[0] === 0x03;
    
    // 使用 p256 曲线参数计算 y
    // y² = x³ + ax + b (mod p)
    // 这里我们直接使用 p256 的 getPublicKey 从私钥生成，但我们需要从压缩公钥恢复
    // 使用第三方库或手动计算
    
    // 简单起见，直接使用 p256 的扩展功能
    const point = p256.ExtendedPoint.fromHex(publicKeyHex);
    publicKeyBytes = point.toRawBytes(false);
  }
  
  // 如果已经是 65 字节未压缩格式，直接使用
  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error('Invalid public key format');
  }

  // P-256 的 Algorithm Identifier (OID: 1.2.840.10045.2.1 和 1.2.840.10045.3.1.7)
  // SEQUENCE { OID ecPublicKey (1.2.840.10045.2.1), OID prime256v1 (1.2.840.10045.3.1.7) }
  const algorithmIdentifier = new Uint8Array([
    0x30, 0x13, // SEQUENCE, length 19
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID prime256v1
  ]);

  // BIT STRING 包装公钥
  const bitStringContent = new Uint8Array(1 + publicKeyBytes.length);
  bitStringContent[0] = 0x00; // unused bits
  bitStringContent.set(publicKeyBytes, 1);

  // BIT STRING
  const bitString = encodeASN1Length(bitStringContent.length);
  const bitStringPrefix = new Uint8Array([0x03, ...bitString]);

  // 组合 SubjectPublicKeyInfo 内容
  const spkiContent = new Uint8Array(
    algorithmIdentifier.length + bitStringPrefix.length + bitStringContent.length
  );
  spkiContent.set(algorithmIdentifier, 0);
  spkiContent.set(bitStringPrefix, algorithmIdentifier.length);
  spkiContent.set(bitStringContent, algorithmIdentifier.length + bitStringPrefix.length);

  // 外层 SEQUENCE
  const finalResult = new Uint8Array(2 + spkiContent.length);
  finalResult[0] = 0x30; // SEQUENCE
  finalResult[1] = spkiContent.length;
  finalResult.set(spkiContent, 2);

  return finalResult;
}

/**
 * 编码 ASN.1 长度
 */
function encodeASN1Length(length: number): number[] {
  if (length < 128) {
    return [length];
  }
  // 长格式（这里简化处理，假设长度不超过 255）
  return [0x81, length & 0xff];
}

/**
 * 将字节数组转换为 Base64 字符串
 */
function bytesToBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  return btoa(binary);
}

export function generateKeyPair(): KeyPair {
  const privateKeyBytes = p256.utils.randomSecretKey();
  const privateKey = bytesToHex(privateKeyBytes);
  
  // 生成未压缩格式的公钥 (65 字节: 04 + x + y)
  const publicKeyBytes = p256.getPublicKey(privateKeyBytes, false);
  const publicKeyHex = bytesToHex(publicKeyBytes);
  
  // 将公钥转换为 DER 格式并 Base64 编码
  const publicKeyDER = publicKeyHexToDER(publicKeyHex);
  const publicKey = bytesToBase64(publicKeyDER);
  
  return { privateKey, publicKey };
}
