export function databaseError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    SELF_SIGNED_CERT_IN_CHAIN: 'Aiven CA certificate is required. Download the service CA certificate from the Aiven console, then set DATABASE_CA_CERT_PATH="C:/Users/Administrator/Downloads/ca.pem" in .env (use its actual saved path).',
    DEPTH_ZERO_SELF_SIGNED_CERT: 'The database certificate is not trusted. Set DATABASE_CA_CERT_PATH to the service CA downloaded from Aiven.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'The database certificate chain could not be verified. Configure the correct Aiven service CA certificate.',
    ENOENT: 'The configured database CA certificate file does not exist. Check DATABASE_CA_CERT_PATH in .env.',
    ENOTFOUND: 'Database hostname could not be resolved. Check the service hostname in Aiven.',
    '28P01': 'Database authentication failed. Check the service username and password in .env.',
    ECONNREFUSED: 'Database refused the connection. Check the service status and port.',
  };
  return code ? messages[code] || `Database operation failed (${code}).` : 'Database operation failed. Check the connection settings and network access.';
}
