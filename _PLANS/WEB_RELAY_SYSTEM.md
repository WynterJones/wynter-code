# Web Relay System for Mobile-Desktop Communication

## Overview

Replace WiFi-only local network requirement with an **open source**, self-hosted relay server (`wynter-code-relay`) that enables mobile-to-desktop connectivity from anywhere. Messages are end-to-end encrypted (relay sees only opaque blobs).

**Project:** `wynter-code-relay` (open source)
**Location:** `/Users/wynterjones/Work/SYSTEM/wynter-code-relay`

**Key Requirements:**
- Open source relay server
- Self-hosted (user deploys their own)
- E2E encryption (ChaCha20-Poly1305 with X25519 key exchange)
- Single mobile device pairing
- **Toggle option**: Users choose WiFi OR Relay mode

---

## Architecture

```
[Mobile] <--WSS--> [Relay Server] <--WSS--> [Desktop]
                        |
                   (encrypted blobs only)
```

**Connection Mode Toggle:**
- WiFi Mode: Direct local network connection (existing)
- Relay Mode: Through user's relay server (new)

---

## Phase 1: Relay Server (wynter-code-relay)

Create open source Rust WebSocket relay server.

### Project Structure

```
wynter-code-relay/
├── Cargo.toml
├── README.md              # Setup & deployment docs
├── LICENSE                # MIT or Apache 2.0
├── src/
│   ├── main.rs            # Entry point, CLI args
│   ├── server.rs          # Axum WebSocket server
│   ├── connections.rs     # Connection management (DashMap)
│   ├── routing.rs         # Message routing logic
│   └── pending.rs         # Offline message queue
├── Dockerfile
└── docker-compose.yml
```

### Core Dependencies
- `axum` + `tokio-tungstenite` - WebSocket server
- `dashmap` - Concurrent connection storage
- `serde` / `serde_json` - Message serialization
- `tracing` - Logging

### Relay Protocol

```rust
// Client -> Relay
enum ClientMessage {
    Handshake { device_id: String, peer_id: String, token: String },
    Message { envelope: EncryptedEnvelope },
    Ping,
}

// Relay -> Client
enum ServerMessage {
    HandshakeAck { success: bool },
    Message { envelope: EncryptedEnvelope },
    PeerStatus { online: bool, pending_count: u32 },
    Pong,
}
```

### Encrypted Envelope (relay sees this)

```rust
struct EncryptedEnvelope {
    sender_id: String,
    recipient_id: String,
    timestamp: u64,
    nonce: String,      // 24 bytes base64
    ciphertext: String, // Encrypted payload base64
}
```

### Offline Queue
- Max 100 pending messages per device
- 1-hour TTL
- FIFO, oldest dropped when full

---

## Phase 2: Desktop Changes (wynter-code)

### Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/Cargo.toml` | Add: `x25519-dalek`, `chacha20poly1305`, `tokio-tungstenite` |
| `src-tauri/src/main.rs` | Register new relay commands |
| `src-tauri/src/mobile_api.rs` | Add relay mode support, message encryption |
| `src/components/settings/MobileCompanionTab.tsx` | Add WiFi/Relay toggle, relay URL config |
| `src/stores/mobileApiStore.ts` | Add relay state management |

### New File: `src-tauri/src/relay_client.rs`

```rust
pub struct RelayClient {
    ws: Option<WebSocketStream>,
    relay_url: String,
    desktop_id: String,
    encryption_key: [u8; 32],
}

impl RelayClient {
    pub async fn connect(&mut self) -> Result<()>;
    pub async fn send(&self, message: StateUpdate) -> Result<()>;
    pub async fn receive(&mut self) -> Result<DecryptedMessage>;

    fn encrypt(&self, plaintext: &[u8]) -> EncryptedEnvelope;
    fn decrypt(&self, envelope: &EncryptedEnvelope) -> Vec<u8>;
}
```

### New Tauri Commands

```rust
#[tauri::command] relay_configure(url: String) -> RelayConfig
#[tauri::command] relay_connect() -> Result<()>
#[tauri::command] relay_disconnect() -> Result<()>
#[tauri::command] relay_status() -> RelayStatus
#[tauri::command] relay_generate_pairing_code() -> RelayPairingData
```

### UI: Connection Mode Toggle

```tsx
// MobileCompanionTab.tsx
<SegmentedControl
  options={['WiFi', 'Relay']}
  value={connectionMode}
  onChange={setConnectionMode}
/>

{connectionMode === 'relay' && (
  <Input
    label="Relay Server URL"
    placeholder="wss://relay.example.com"
    value={relayUrl}
    onChange={setRelayUrl}
  />
)}
```

### Modified QR Code Format

```typescript
// WiFi mode (existing)
wynter://pair?mode=wifi&code=123456&host=192.168.1.100&port=8765

// Relay mode (new)
wynter://pair?mode=relay&relay=wss://relay.example.com&desktop_id=abc123&pubkey=base64...&token=xyz
```

### Config Storage

`~/.wynter-code/relay_config.json`:
```json
{
  "url": "wss://relay.example.com",
  "enabled": true,
  "desktop_id": "uuid",
  "private_key": "base64...",
  "public_key": "base64...",
  "peer_public_key": "base64..."
}
```

---

## Phase 3: Mobile Changes (wynter-code-mobile)

### Files to Modify

| File | Changes |
|------|---------|
| `src/stores/connectionStore.ts` | Add relay mode state, mode toggle |
| `src/api/validation.ts` | Skip private IP check for relay mode |
| `src/api/websocket.ts` | Route through relay when in relay mode |
| `src/api/base.ts` | Encrypt HTTP requests for relay |
| `app/modal.tsx` | Parse relay QR codes |
| `app/(tabs)/settings.tsx` | Show connection mode indicator |

### New Files

**`src/api/relay.ts`** - Relay WebSocket manager
```typescript
export class RelayWebSocketManager {
  connect(relayUrl: string, desktopId: string, encryptionKey: Uint8Array): void;
  sendEncrypted(message: object): void;
  disconnect(): void;
}
```

**`src/api/relayCrypto.ts`** - E2E encryption
```typescript
export async function generateX25519KeyPair(): Promise<KeyPair>;
export async function deriveSharedKey(privateKey, peerPublicKey): Promise<Uint8Array>;
export async function encrypt(plaintext, key, nonce): Promise<Uint8Array>;
export async function decrypt(ciphertext, key, nonce): Promise<Uint8Array>;
```

### Modified Connection Store

```typescript
interface ConnectionState {
  // Existing fields...
  connectionMode: 'wifi' | 'relay';
  relayConfig?: {
    url: string;
    desktopId: string;
    encryptionKey: string;
  };
}
```

---

## Phase 4: E2E Encryption Details

### Key Exchange (during pairing)

1. Desktop generates X25519 keypair, includes public key in QR
2. Mobile generates X25519 keypair on scan
3. Both derive shared secret via X25519 DH
4. Derive encryption key: `HKDF-SHA256(shared_secret, "wynter-relay-v1")`

### Message Encryption

- Algorithm: ChaCha20-Poly1305 (AEAD)
- Nonce: 24 random bytes per message
- Ciphertext includes auth tag

### What Relay Sees vs What's Encrypted

| Visible to Relay | Encrypted |
|------------------|-----------|
| sender_id | HTTP method, path, headers, body |
| recipient_id | WebSocket message content |
| timestamp | All application data |
| nonce | |

---

## Phase 5: Testing & Documentation

1. Integration tests (desktop <-> relay <-> mobile)
2. Security audit of encryption implementation
3. Performance testing (latency, throughput)
4. README with deployment instructions
5. Docker/docker-compose examples

---

## Implementation Order

1. **Phase 1: Relay Server** - Create `wynter-code-relay/` project
2. **Phase 2: Desktop Integration** - Add relay client + UI toggle
3. **Phase 3: Mobile Integration** - Add relay mode + encryption
4. **Phase 4: Encryption** - Implement E2E crypto
5. **Phase 5: Testing** - Integration tests + docs

---

## Critical Files Summary

**Relay Server (new project):**
- `wynter-code-relay/src/main.rs`
- `wynter-code-relay/src/server.rs`
- `wynter-code-relay/src/routing.rs`

**Desktop:**
- `src-tauri/src/relay_client.rs` (new)
- `src-tauri/src/mobile_api.rs` (modify)
- `src/components/settings/MobileCompanionTab.tsx` (modify)

**Mobile:**
- `src/api/relay.ts` (new)
- `src/api/relayCrypto.ts` (new)
- `src/stores/connectionStore.ts` (modify)
- `src/api/validation.ts` (modify)
