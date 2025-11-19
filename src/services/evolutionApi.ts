// Evolution API integration service
// Replaces n8n workflows with direct API calls

const EVOLUTION_API_URL = 'https://api.bflabs.com.br';
const EVOLUTION_API_KEY = '9a38befe6a9f6938cd70cb769c66357d';

interface EvolutionInstance {
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QRCODE';
  owner?: string;
  profilePicUrl?: string;
}

interface SendTextParams {
  instanceName: string;
  number: string;
  text: string;
}

interface SendMediaParams {
  instanceName: string;
  number: string;
  mediatype: 'image' | 'video' | 'document' | 'audio';
  media: string;
  caption?: string;
}

// Helper function for API calls
async function evolutionApiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${EVOLUTION_API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Evolution API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Instance Management
export async function fetchAllInstances(): Promise<EvolutionInstance[]> {
  try {
    const instances = await evolutionApiCall('/instance/fetchInstances');

    // Transform the data to match our interface
    return instances.map((instance: any) => ({
      name: instance.name,
      status: instance.connectionStatus || 'DISCONNECTED',
      owner: instance.owner,
      profilePicUrl: instance.profilePicUrl,
    }));
  } catch (error) {
    console.error('Error fetching instances:', error);
    throw error;
  }
}

// Connection Status
export async function getConnectionState(instanceName: string): Promise<{ status: string }> {
  return evolutionApiCall(`/instance/connectionState/${instanceName}`);
}

// QR Code Generation
export async function generateQrCode(instanceName: string): Promise<{ qrCode: string }> {
  return evolutionApiCall(`/instance/qrCode/${instanceName}`);
}

// Send Text Message
export async function sendTextMessage(params: SendTextParams): Promise<any> {
  const { instanceName, number, text } = params;

  // Clean the phone number (remove non-digits)
  const cleanNumber = number.replace(/\D/g, '');

  return evolutionApiCall(`/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: cleanNumber,
      text,
    }),
  });
}

// Send Media Message
export async function sendMediaMessage(params: SendMediaParams): Promise<any> {
  const { instanceName, number, mediatype, media, caption } = params;

  // Clean the phone number
  const cleanNumber = number.replace(/\D/g, '');

  return evolutionApiCall(`/message/sendMedia/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: cleanNumber,
      mediatype,
      media,
      caption,
    }),
  });
}

// Filter instances based on user-defined filter
export function filterInstances(instances: EvolutionInstance[], filter: string): EvolutionInstance[] {
  if (!filter || filter.trim() === '') {
    return instances;
  }

  const filterLower = filter.toLowerCase();
  return instances.filter(instance =>
    instance.name.toLowerCase().includes(filterLower) ||
    instance.status.toLowerCase().includes(filterLower) ||
    (instance.owner && instance.owner.toLowerCase().includes(filterLower))
  );
}